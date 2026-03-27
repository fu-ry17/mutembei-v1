import json
import os
import re
import time
from difflib import SequenceMatcher

import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
from tqdm import tqdm

BENEFIT_RULES = [
    ("TBX-10144", ["nicu", "neonatal intensive care unit", "neonatal intensive care"]),
    (
        "TBX-10145",
        [
            "picu",
            "paediatric intensive care unit",
            "pediatric intensive care unit",
            "paediatric intensive care",
            "pediatric intensive care",
        ],
    ),
    ("TBX-10142", ["icu"]),
    ("TBX-10143", ["hdu", "hdu unit", "high dependency unit", "high dependency"]),
    ("TBX-10146", ["burn unit", "burns unit", "burn ward", "burns ward"]),
    (
        "TBX-10730",
        [
            "new born unit",
            "newborn unit",
            "nbu",
            "neonatal unit",
            "neonatal ward",
            "new born ward",
            "newborn ward",
        ],
    ),
    ("TBX-10732", ["palliative", "palliative care", "palliative ward"]),
    (
        "TBX-10729",
        [
            "maternity",
            "maternity ward",
            "maternity service",
            "antenatal",
            "anc",
            "postnatal",
            "delivery",
            "labour",
            "labor",
            "kangaroo",
        ],
    ),
    (
        "TBX-10728",
        [
            "surgical ward",
            "theatre",
            "operating theatre",
            "recovery ward",
        ],
    ),
    (
        "TBX-10727",
        [
            "medical ward",
            "general ward",
            "paediatric ward",
            "pediatric ward",
            "isolation ward",
            "gynae ward",
        ],
    ),
]

FINAL_COLUMNS = [
    "ID",
    "Service Unit",
    "Company",
    "Benefits Exchange ID",
    "ID (Inpatient Standing Charges)",
    "Item (Inpatient Standing Charges)",
    "Minimum Charge (Inpatient Standing Charges)",
    "Unit Price (Inpatient Standing Charges)",
    "Unit Of Measure (Inpatient Standing Charges)",
]

TBX_COLS = [
    ("TBX-10727", "Management of medical cases"),
    ("TBX-10728", "Surgical Complications"),
    ("TBX-10729", "Post-partum Complications"),
    ("TBX-10730", "Neonatal Complications"),
    ("TBX-10142", "ICU Care"),
    ("TBX-10143", "HDU Care"),
    ("TBX-10144", "NICU Care"),
    ("TBX-10145", "PICU Care"),
    ("TBX-10146", "Intensive care Burns Unit"),
    ("TBX-10732", "Palliative Services"),
]

NO_LABELS = {
    "TBX-10727": "No Medical Ward",
    "TBX-10728": "No Surgical Wards",
    "TBX-10729": "No Maternity Ward",
    "TBX-10730": "No NBU Unit",
    "TBX-10142": "No ICU",
    "TBX-10143": "No HDU",
    "TBX-10144": "No NICU",
    "TBX-10145": "No PICU",
    "TBX-10146": "No ICBU",
    "TBX-10732": "No Palliative Services",
}

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def _get_gspread_client():
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw:
        raise RuntimeError("Missing env var GOOGLE_SERVICE_ACCOUNT_JSON")
    creds = Credentials.from_service_account_info(json.loads(raw), scopes=SCOPES)
    return gspread.authorize(creds)


def _unique_code(job_id):
    return job_id.replace("-", "")[:2].lower()


def _make_tab_name(prefix, code):
    return f"{prefix}_{code}"


def _write_tab(spreadsheet, df, tab_name):
    try:
        spreadsheet.del_worksheet(spreadsheet.worksheet(tab_name))
    except gspread.WorksheetNotFound:
        pass

    ws = spreadsheet.add_worksheet(
        title=tab_name,
        rows=max(len(df) + 10, 100),
        cols=max(len(df.columns) + 2, 20),
    )

    data = [df.columns.tolist()] + df.fillna("").astype(str).values.tolist()
    ws.update(data, value_input_option="USER_ENTERED")
    time.sleep(1.2)


def _build_charges_lookup(extra):
    return {
        label: [(i["name"], i["amount"]) for i in extra[key]]
        for key, label in {
            "l2": "LEVEL 2",
            "l3": "LEVEL 3",
            "l4": "LEVEL 4",
            "l5": "LEVEL 5",
        }.items()
        if extra.get(key)
    }


def _clean_level(val):
    s = str(val).upper()
    for n in ("2", "3", "4", "5"):
        if f"LEVEL {n}" in s or f"LEVEL{n}" in s:
            return f"LEVEL {n}"
    return s


def _clean_text(text):
    text = str(text).lower()
    text = re.sub(r"[/\\]", " ", text)
    text = re.sub(r"[^a-z0-9\s&]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _word_boundary_ratio(text, keyword):
    text_tokens = set(text.split())
    kw_tokens = keyword.split()
    if not kw_tokens:
        return 0
    matched = sum(
        1
        for kt in kw_tokens
        if max((SequenceMatcher(None, kt, tt).ratio() for tt in text_tokens), default=0)
        >= 0.85
    )
    return int((matched / len(kw_tokens)) * 100)


def _assign_benefit(service_unit):
    if pd.isna(service_unit) or str(service_unit).strip() == "":
        return None
    cleaned = _clean_text(str(service_unit))
    if not cleaned:
        return None
    tokens = set(cleaned.split())

    for tbx_code, keywords in BENEFIT_RULES:
        best = 0
        for kw in keywords:
            kw_clean = _clean_text(kw)
            score = (
                100
                if (len(kw_clean) <= 4 and kw_clean in tokens)
                else _word_boundary_ratio(cleaned, kw_clean)
            )
            best = max(best, score)

        if best >= 85:
            return tbx_code

    return None


def _to_int_str(val):
    try:
        if pd.isna(val) or val == "":
            return ""
        return str(int(float(val)))
    except Exception:
        return ""


def run_pipeline(job):
    extra = job["extra"]
    sheet_id = extra["sheet_id"]
    benefits_gid = extra["benefits_gid"]
    facility_gid = extra["facility_gid"]
    county = extra["county"]
    assignee = extra["assignee"]
    code = _unique_code(job["id"])

    charges_lookup = _build_charges_lookup(extra)

    try:
        df_benefits = pd.read_csv(
            f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={benefits_gid}"
        ).apply(lambda x: x.str.strip() if x.dtype == "object" else x)

        df_facility = pd.read_csv(
            f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={facility_gid}"
        ).apply(lambda x: x.str.strip() if x.dtype == "object" else x)

        df_benefits["_co"] = df_benefits["Company"].str.lower()
        df_facility["_co"] = df_facility["Company"].str.lower()

        merged = df_benefits.merge(
            df_facility[["_co", "Facility Level"]], on="_co", how="left"
        ).drop(columns=["_co"])

        merged["Facility Level"] = merged["Facility Level"].apply(_clean_level)

        tqdm.pandas()
        merged["Benefits Exchange ID"] = merged["Service Unit"].progress_apply(
            _assign_benefit
        )
        merged["_parent_ward"] = merged["Service Unit"].replace("", pd.NA).ffill()
        merged["Benefits Exchange ID"] = merged["Benefits Exchange ID"].ffill()

        output_rows = []
        unmatched_rows = []

        for (company, parent_ward), group in merged.groupby(
            ["Company", "_parent_ward"], sort=False
        ):
            benefit_id = group["Benefits Exchange ID"].iloc[0]
            fac_level = group["Facility Level"].iloc[0]
            original_id = group["ID"].iloc[0]

            if pd.notna(benefit_id) and fac_level in charges_lookup:
                for i, (item_name, price) in enumerate(charges_lookup[fac_level]):
                    row = {col: "" for col in FINAL_COLUMNS}
                    if i == 0:
                        row["ID"] = original_id
                        row["Service Unit"] = parent_ward
                        row["Company"] = company
                        row["Benefits Exchange ID"] = benefit_id

                    row["Item (Inpatient Standing Charges)"] = item_name
                    row["Minimum Charge (Inpatient Standing Charges)"] = 1
                    row["Unit Price (Inpatient Standing Charges)"] = price
                    row["Unit Of Measure (Inpatient Standing Charges)"] = "Nos"

                    output_rows.append(row)

            else:
                unmatched_rows.append(
                    {
                        "Company": company,
                        "Service Unit": parent_ward,
                        "Facility Level": fac_level,
                        "Benefits Exchange ID": benefit_id
                        if pd.notna(benefit_id)
                        else "NO MATCH",
                        "Reason": (
                            "No charges configured for level"
                            if pd.notna(benefit_id)
                            else "No benefit rule matched"
                        ),
                    }
                )

                for _, r in group.iterrows():
                    row = {col: r.get(col, "") for col in FINAL_COLUMNS}
                    output_rows.append(row)

        final_df = pd.DataFrame(output_rows)

        final_df["Minimum Charge (Inpatient Standing Charges)"] = final_df[
            "Minimum Charge (Inpatient Standing Charges)"
        ].apply(_to_int_str)

        final_df["Unit Price (Inpatient Standing Charges)"] = final_df[
            "Unit Price (Inpatient Standing Charges)"
        ].apply(_to_int_str)

        report_rows = []
        for company in sorted(df_facility["Company"].dropna().unique()):
            fac_data = merged[merged["Company"] == company]

            rep = {
                "County": county,
                "Facility Name": company,
                "Assignee": assignee,
                "Inpatient Daily Charges": (
                    "Configured"
                    if not final_df[final_df["Company"] == company].empty
                    else "Not configured"
                ),
            }

            for tbx_code, col_name in TBX_COLS:
                matched = (
                    fac_data[fac_data["Benefits Exchange ID"] == tbx_code][
                        "_parent_ward"
                    ]
                    .dropna()
                    .unique()
                )

                formatted = [
                    f"{str(w).strip()} - {tbx_code}" for w in matched if str(w).strip()
                ]

                rep[col_name] = (
                    " | ".join(formatted)
                    if formatted
                    else NO_LABELS.get(tbx_code, "N/A")
                )

            report_rows.append(rep)

        gc = _get_gspread_client()
        spreadsheet = gc.open_by_key(sheet_id)

        tabs = {
            "benefit_exchange_final": final_df[FINAL_COLUMNS],
            "unmatched_service_units": pd.DataFrame(unmatched_rows),
            "facility_config_report": pd.DataFrame(report_rows),
        }

        written_tabs = []
        for prefix, df in tabs.items():
            tab_name = _make_tab_name(prefix, code)
            _write_tab(spreadsheet, df, tab_name)
            written_tabs.append(tab_name)

        return {
            "success": True,
            "tabs_written": written_tabs,
            "summary": {
                "benefit_exchange_rows": len(final_df),
                "unmatched_rows": len(unmatched_rows),
                "facilities": len(report_rows),
            },
        }

    except Exception as e:
        import traceback

        return {"success": False, "error": f"{str(e)}\n{traceback.format_exc()}"}
