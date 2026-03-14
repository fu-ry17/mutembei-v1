import asyncio
from typing import Any, Dict

from playwright.async_api import async_playwright


async def run_facility_setup(job: Dict[str, Any]):
    credential = job["credential"]["encrypted_data"]
    credential_extra = job["credential"].get("extra", {})
    extra = job["extra"]

    LOGIN = {
        "url": credential_extra["url"],
        "email": credential["email"],
        "password": credential["password"],
    }

    FACILITY = extra["facility"]
    WAREHOUSE_NAME = extra["warehouse_name"]
    PRACTITIONERS = extra["practitioners"]
    SERVICE_UNITS = extra["service_units"]
    LABORATORIES = extra["laboratories"]
    FACILITY_SETTINGS = extra["facility_settings"]

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
            ],
        )
        page = await browser.new_page()

        try:
            # 1. Login
            await page.goto(LOGIN["url"])
            await page.wait_for_load_state("networkidle")
            await page.fill(
                'input[type="email"], input[placeholder*="email" i]', LOGIN["email"]
            )
            await page.fill(
                'input[type="password"], input[placeholder*="password" i]',
                LOGIN["password"],
            )
            await page.click('button:has-text("Sign In")')
            try:
                await page.wait_for_url(lambda url: "#/login" not in url, timeout=15000)
                print("✅ Login successful")
            except Exception:
                raise RuntimeError("Login failed — invalid credentials or timeout")

            # 2. New facility setup
            await page.wait_for_selector(
                'button:has-text("New Facility Setup"), a:has-text("New Facility Setup")',
                timeout=10000,
            )
            await page.click(
                'button:has-text("New Facility Setup"), a:has-text("New Facility Setup")'
            )
            await page.wait_for_load_state("networkidle")
            print("✅ New Facility Setup clicked")

            # 3. Search & select facility
            facility_search = (
                'input[placeholder*="facility name" i], input[placeholder*="search" i]'
            )
            await page.wait_for_selector(facility_search, timeout=10000)
            await page.click(facility_search)
            await page.type(facility_search, FACILITY["search_term"], delay=150)
            await page.wait_for_selector(
                f"text={FACILITY['select_text']}", timeout=15000
            )
            await page.click(f"text={FACILITY['select_text']}")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1.5)
            print(f"✅ Facility '{FACILITY['select_text']}' selected")

            # 3a. Abbreviation
            try:
                abbr = FACILITY["abbreviation"]
                print(f"⏳ Setting abbreviation to '{abbr}'")
                abbr_input = page.locator(
                    'input[placeholder*="ABC" i], input[placeholder*="abbreviation" i], input[placeholder*="MATAN" i]'
                ).first
                await abbr_input.wait_for(timeout=5000)
                await abbr_input.scroll_into_view_if_needed()
                await abbr_input.click(click_count=3)
                await abbr_input.fill(abbr)
                await abbr_input.evaluate("""
                    el => {
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                """)
                await asyncio.sleep(0.4)
                print(f"✅ Abbreviation set to '{abbr}'")
            except Exception as e:
                print(f"⚠️ Abbreviation error: {e}")

            await page.click('button:has-text("Next")')
            await page.wait_for_load_state("networkidle")
            print("✅ Facility step done → Warehouses")

            # 4. Warehouse
            await page.wait_for_selector(
                'input[placeholder*="Main Pharmacy" i]', timeout=10000
            )
            await page.fill('input[placeholder*="Main Pharmacy" i]', WAREHOUSE_NAME)
            await asyncio.sleep(0.5)
            await page.click('button:has-text("Next")')
            await page.wait_for_load_state("networkidle")
            print(f"✅ Warehouse '{WAREHOUSE_NAME}' set")

            # 5. Practitioners
            print(f"⏳ Adding {len(PRACTITIONERS)} practitioner(s)")
            for i, practitioner in enumerate(PRACTITIONERS):
                await page.wait_for_selector(
                    'button:has-text("Add Practitioner")', timeout=10000
                )
                await page.click('button:has-text("Add Practitioner")')
                await asyncio.sleep(0.8)
                await fill_practitioner(page, practitioner, i)
                print(
                    f"  ✅ Practitioner {i + 1}: {practitioner['first_name']} {practitioner['last_name']}"
                )
            await asyncio.sleep(0.5)
            await page.click('button:has-text("Next")')
            await page.wait_for_load_state("networkidle")
            print("✅ Practitioners done")

            # 6. Service units
            print(f"⏳ Adding {len(SERVICE_UNITS)} service unit(s)")
            for i, service_unit in enumerate(SERVICE_UNITS):
                await page.wait_for_selector(
                    'button:has-text("Add Service Unit"), button:has-text("Add Your First Service Unit")',
                    timeout=10000,
                )
                await page.click(
                    'button:has-text("Add Service Unit"), button:has-text("Add Your First Service Unit")'
                )
                await asyncio.sleep(0.8)
                await fill_service_unit(page, service_unit, i)
                print(f"  ✅ Service unit {i + 1}: {service_unit['name']}")
            await asyncio.sleep(0.5)
            await page.click('button:has-text("Next")')
            await page.wait_for_load_state("networkidle")
            print("✅ Service Units done")

            # 7. Laboratories
            print(f"⏳ Adding {len(LABORATORIES)} laborator(ies)")
            for i, lab in enumerate(LABORATORIES):
                await fill_laboratory(page, lab, i)
                print(f"  ✅ Laboratory {i + 1}: {lab['name']}")
            await asyncio.sleep(0.5)
            await page.click('button:has-text("Next")')
            await page.wait_for_load_state("networkidle")
            print("✅ Laboratories done")

            # 8. Assignments
            print("⏳ Filling assignments")
            await fill_assignments(page, PRACTITIONERS, WAREHOUSE_NAME, LABORATORIES)
            await page.click('button:has-text("Next")')
            await page.wait_for_load_state("networkidle")
            print("✅ Assignments done")

            # 9. Facility settings
            print("⏳ Filling facility settings")
            await fill_settings(page, FACILITY_SETTINGS)
            await asyncio.sleep(0.5)

            # 10. Save draft
            await page.wait_for_selector('button:has-text("Save Draft")', timeout=10000)
            await page.click('button:has-text("Save Draft")')
            await page.wait_for_load_state("networkidle")
            print("✅ Save Draft — setup complete")

            await asyncio.sleep(2)

        finally:
            await browser.close()
            print("✅ Browser closed")


# Helpers
async def select_from_dropdown(page, trigger_locator, value):
    await trigger_locator.click()
    await asyncio.sleep(0.8)
    items = page.locator("li.el-select-dropdown__item:visible")
    count = await items.count()
    for j in range(count):
        try:
            text = (await items.nth(j).text_content(timeout=300) or "").strip()
            if text.lower() == value.lower():
                await items.nth(j).click()
                await asyncio.sleep(0.2)
                return True
        except:
            continue
    for j in range(count):
        try:
            text = (await items.nth(j).text_content(timeout=300) or "").strip()
            if text.lower().startswith(value.lower()):
                await items.nth(j).click()
                await asyncio.sleep(0.2)
                return True
        except:
            continue
    print(f"⚠️ Dropdown value not found: '{value}'")
    return False


async def select_all_from_multiselect(page, trigger_locator):
    await trigger_locator.click()
    await asyncio.sleep(0.8)
    items = page.locator("li.el-select-dropdown__item:visible")
    count = await items.count()
    for j in range(count):
        try:
            is_selected = await items.nth(j).evaluate(
                "el => el.classList.contains('is-selected')"
            )
            if not is_selected:
                await items.nth(j).click()
                await asyncio.sleep(0.2)
        except:
            continue
    await page.keyboard.press("Escape")
    await asyncio.sleep(0.4)
    return count


async def select_first_from_dropdown(page, trigger_locator):
    await trigger_locator.click()
    await asyncio.sleep(0.8)
    items = page.locator("li.el-select-dropdown__item:visible")
    if await items.count() > 0:
        await items.nth(0).click()
        await asyncio.sleep(0.2)
        return True
    print("⚠️ No items found in dropdown")
    return False


async def get_wrapper_by_placeholder(page, card, card_box, keyword, label=""):
    all_w = page.locator("div.el-select__wrapper")
    total_w = await all_w.count()
    in_card_wrappers = []

    for w in range(total_w):
        try:
            wr = all_w.nth(w)
            wr_box = await wr.bounding_box()
            if not wr_box:
                continue
            in_card = (
                wr_box["y"] >= card_box["y"]
                and wr_box["y"] <= card_box["y"] + card_box["height"]
                and wr_box["x"] >= card_box["x"]
                and wr_box["x"] <= card_box["x"] + card_box["width"]
            )
            if not in_card:
                continue
            ph = ""
            try:
                ph = (
                    await wr.locator("span.el-select__placeholder").first.text_content(
                        timeout=200
                    )
                    or ""
                ).strip()
            except:
                pass
            if not ph:
                try:
                    ph = (
                        await wr.locator("input").first.get_attribute(
                            "placeholder", timeout=200
                        )
                        or ""
                    ).strip()
                except:
                    pass
            in_card_wrappers.append((wr_box["y"], wr_box["x"], wr, ph))
        except:
            continue

    in_card_wrappers.sort(key=lambda t: (t[0], t[1]))

    for y, x, wr, ph in in_card_wrappers:
        if keyword.lower() in ph.lower():
            return wr

    positional_map = {"service unit": 0, "warehouse": 1, "laborator": 2}
    pos = positional_map.get(keyword.lower())
    if pos is not None and len(in_card_wrappers) > pos:
        _, _, wr, _ = in_card_wrappers[pos]
        return wr

    print(f"⚠️ Could not find wrapper for keyword: '{keyword}'")
    return None


async def fill_practitioner(page, practitioner, index):
    await (
        page.locator('input[placeholder="First name"]')
        .nth(index)
        .fill(practitioner["first_name"])
    )
    if practitioner.get("middle_name"):
        await (
            page.locator('input[placeholder="Middle name"]')
            .nth(index)
            .fill(practitioner["middle_name"])
        )
    await (
        page.locator('input[placeholder="Last name"]')
        .nth(index)
        .fill(practitioner["last_name"])
    )
    await (
        page.locator('input[placeholder="email@example.com"]')
        .nth(index)
        .fill(practitioner["email"])
    )
    await (
        page.locator('input[placeholder="+254700000000"]')
        .nth(index)
        .fill(practitioner["phone"].replace("+254", ""))
    )
    if practitioner.get("national_id"):
        await (
            page.locator('input[placeholder="National ID number"]')
            .nth(index)
            .fill(practitioner["national_id"])
        )
    await select_from_dropdown(
        page,
        page.locator("div.el-select__wrapper").nth(index * 3),
        practitioner.get("gender", "Other"),
    )
    await select_from_dropdown(
        page,
        page.locator("div.el-select__wrapper").nth(index * 3 + 2),
        practitioner.get("role", "Physician"),
    )


async def fill_service_unit(page, service_unit, index):
    billing_amount = service_unit.get("billing_amount")
    capacity = service_unit.get("capacity", "1000")
    unit_type = service_unit.get("type", "Outpatient")

    await (
        page.locator('input[placeholder*="Emergency Department" i]')
        .nth(index)
        .fill(service_unit["name"])
    )
    await asyncio.sleep(0.2)

    card = page.locator("div.el-card").filter(has_text=service_unit["name"]).last
    type_wrapper = card.locator("div.el-select__wrapper").first
    await select_from_dropdown(page, type_wrapper, unit_type)
    await asyncio.sleep(0.2)

    capacity_field = page.locator(
        'input[type="number"]:not([placeholder="Stage"]):not([placeholder="Price"]):not([placeholder="Code"])'
    ).nth(index)
    await capacity_field.click()
    await capacity_field.press("Control+a")
    await capacity_field.press("Meta+a")
    await capacity_field.fill(capacity)
    await capacity_field.press("Tab")
    await asyncio.sleep(0.2)

    if unit_type != "Inpatient":
        await select_first_from_dropdown(
            page,
            page.locator("div.el-select__wrapper")
            .filter(has_text="Select practitioner")
            .first,
        )

    await select_first_from_dropdown(
        page,
        page.locator("div.el-select__wrapper")
        .filter(has_text="Select warehouse")
        .first,
    )

    card = page.locator("div.el-card").filter(has_text=service_unit["name"]).last
    sp_panel = (
        card.locator("div")
        .filter(has_text="Configure service points for this unit")
        .first
    )

    while True:
        row_delete_btns = sp_panel.locator("button.el-button--danger.el-button--small")
        if await row_delete_btns.count() == 0:
            break
        await row_delete_btns.last.click()
        await asyncio.sleep(0.6)

    add_point = sp_panel.locator("a, span, button").filter(has_text="Add Point").first
    for sp in service_unit.get("service_points", []):
        await add_point.click()
        await asyncio.sleep(0.6)
        last_point = sp_panel.locator('input[placeholder="Point name"]').last
        await last_point.fill(sp["name"])
        await asyncio.sleep(0.2)
        await select_from_dropdown(
            page,
            sp_panel.locator("div.el-select__wrapper").last,
            sp.get("type", "Room"),
        )
        stage_inp = sp_panel.locator('input[placeholder="Stage"]').last
        await stage_inp.fill(str(sp.get("stage", 1)))
        await asyncio.sleep(0.1)
        await sp_panel.locator("text=Configure service points").first.click()
        await asyncio.sleep(0.2)

    await card.scroll_into_view_if_needed()
    await asyncio.sleep(0.3)

    if billing_amount:
        card_price_inputs = card.locator('input[type="number"][placeholder="Price"]')
        for b in range(await card_price_inputs.count()):
            await card_price_inputs.nth(b).evaluate(
                f"el => {{ el.focus(); el.value = '{billing_amount}'; "
                f"el.dispatchEvent(new Event('input', {{bubbles:true}})); "
                f"el.dispatchEvent(new Event('change', {{bubbles:true}})); el.blur(); }}"
            )
            await asyncio.sleep(0.1)

    for category in service_unit.get("service_categories", []):
        await page.evaluate("window.scrollBy(0, 400)")
        await asyncio.sleep(0.3)
        card_box = await card.bounding_box()
        all_candidates = page.locator("label, span").filter(has_text=category)
        for c in range(await all_candidates.count()):
            try:
                cand = all_candidates.nth(c)
                text = (await cand.text_content() or "").strip()
                if len(text) > 60:
                    continue
                cand_box = await cand.bounding_box()
                if (
                    cand_box
                    and card_box
                    and cand_box["y"] >= card_box["y"]
                    and cand_box["y"] <= card_box["y"] + card_box["height"]
                ):
                    await cand.scroll_into_view_if_needed()
                    await cand.click()
                    await asyncio.sleep(0.2)
                    break
            except:
                continue

    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(0.3)


async def fill_laboratory(page, lab, index):
    await page.wait_for_selector('button:has-text("Add Laboratory")', timeout=10000)
    await page.click('button:has-text("Add Laboratory")')
    await asyncio.sleep(0.8)
    lab_name_input = page.locator(
        'input[placeholder*="Main Lab" i], input[placeholder*="lab name" i], input[placeholder*="Laboratory" i]'
    ).nth(index)
    await lab_name_input.fill(lab["name"])
    await asyncio.sleep(0.2)
    await select_from_dropdown(
        page,
        page.locator("div.el-select__wrapper")
        .filter(has_text="Select warehouse")
        .first,
        lab["warehouse"],
    )


async def fill_assignments(page, practitioners, warehouse_name, laboratories):
    await page.wait_for_selector("div.el-card", timeout=10000)
    await asyncio.sleep(1.0)
    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(0.5)

    all_cards = page.locator("div.el-card")
    total_cards = await all_cards.count()
    practitioner_card_map = []
    seen_indices = set()

    for ci in range(total_cards):
        if ci in seen_indices:
            continue
        card = all_cards.nth(ci)
        try:
            card_box = await card.bounding_box()
            if not card_box or card_box["height"] > 600:
                continue
            heading = card.locator("h2, h3, h4, strong, b").first
            h_text = (await heading.text_content() or "").strip()
            for p in practitioners:
                full_name = p["first_name"]
                if p.get("middle_name"):
                    full_name += f" {p['middle_name']}"
                full_name += f" {p['last_name']}"
                if full_name.lower() == h_text.lower() and ci not in seen_indices:
                    seen_indices.add(ci)
                    practitioner_card_map.append((ci, full_name, p))
        except:
            continue

    for card_index, full_name, _ in practitioner_card_map:
        print(f"  ⏳ Assigning: {full_name}")
        card = all_cards.nth(card_index)
        await card.scroll_into_view_if_needed()
        await asyncio.sleep(0.8)
        card_box = await card.bounding_box()

        su_el = await get_wrapper_by_placeholder(
            page, card, card_box, "service unit", "Service Units"
        )
        if su_el:
            try:
                await su_el.scroll_into_view_if_needed()
                await select_all_from_multiselect(page, su_el)
                print(f"    ✅ Service units assigned for {full_name}")
            except Exception as e:
                print(f"    ⚠️ Service Units assignment error: {e}")

        await asyncio.sleep(0.8)
        card_box = await card.bounding_box()

        wh_el = await get_wrapper_by_placeholder(
            page, card, card_box, "warehouse", "Warehouse"
        )
        if wh_el:
            try:
                await wh_el.scroll_into_view_if_needed()
                await select_from_dropdown(page, wh_el, warehouse_name)
                print(f"    ✅ Warehouse assigned for {full_name}")
            except Exception as e:
                print(f"    ⚠️ Warehouse assignment error: {e}")

        await asyncio.sleep(0.5)
        card_box = await card.bounding_box()

        lab_el = await get_wrapper_by_placeholder(
            page, card, card_box, "laborator", "Laboratory"
        )
        if lab_el:
            try:
                await lab_el.scroll_into_view_if_needed()
                await select_from_dropdown(page, lab_el, laboratories[0]["name"])
                print(f"    ✅ Laboratory assigned for {full_name}")
            except Exception as e:
                print(f"    ⚠️ Laboratory assignment error: {e}")

        await asyncio.sleep(0.3)


async def fill_settings(page, facility_settings):
    await page.wait_for_selector("div.el-select__wrapper", timeout=15000)
    await asyncio.sleep(1.2)
    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(0.5)

    try:
        wh = (
            page.locator("div.el-select__wrapper")
            .filter(has_text="Select default warehouse")
            .first
        )
        await wh.scroll_into_view_if_needed()
        await select_from_dropdown(page, wh, facility_settings["default_warehouse"])
        print("✅ Default warehouse set")
    except Exception as e:
        print(f"⚠️ Default Warehouse error: {e}")

    await asyncio.sleep(0.5)

    try:
        sc = (
            page.locator("div.el-select__wrapper")
            .filter(has_text="Select sub-county")
            .first
        )
        await sc.scroll_into_view_if_needed()
        result = await select_from_dropdown(page, sc, facility_settings["sub_county"])
        if not result:
            parts = facility_settings["sub_county"].lower().split()
            await sc.click()
            await asyncio.sleep(0.8)
            items = page.locator("li.el-select-dropdown__item:visible")
            for j in range(await items.count()):
                try:
                    text = (await items.nth(j).text_content(timeout=300) or "").strip()
                    if all(p in text.lower() for p in parts):
                        await items.nth(j).click()
                        break
                except:
                    continue
        print("✅ Sub-county set")
    except Exception as e:
        print(f"⚠️ Sub County error: {e}")

    await asyncio.sleep(0.5)

    try:
        pr = (
            page.locator("div.el-select__wrapper")
            .filter(has_text="Select practitioner")
            .first
        )
        await pr.scroll_into_view_if_needed()
        if facility_settings.get("walk_in_practitioner"):
            await select_from_dropdown(
                page, pr, facility_settings["walk_in_practitioner"]
            )
        else:
            await select_first_from_dropdown(page, pr)
        print("✅ Walk-in practitioner set")
    except Exception as e:
        print(f"⚠️ Practitioner error: {e}")

    await asyncio.sleep(0.5)

    try:
        su = (
            page.locator("div.el-select__wrapper")
            .filter(has_text="Select service unit")
            .first
        )
        await su.scroll_into_view_if_needed()
        await select_from_dropdown(page, su, facility_settings["walk_in_service_unit"])
        print("✅ Walk-in service unit set")
    except Exception as e:
        print(f"⚠️ Service Unit error: {e}")

    await asyncio.sleep(0.5)

    if facility_settings.get("farewell_service_unit"):
        try:
            fw = (
                page.locator("div.el-select__wrapper")
                .filter(has_text="Pick mortuary service unit")
                .first
            )
            await fw.scroll_into_view_if_needed()
            await select_from_dropdown(
                page, fw, facility_settings["farewell_service_unit"]
            )
            print("✅ Farewell service unit set")
        except Exception as e:
            print(f"⚠️ Farewell Service Unit error: {e}")
        await asyncio.sleep(0.5)

    try:
        lab = page.locator("div.el-select__wrapper").filter(has_text="Pick lab").first
        await lab.scroll_into_view_if_needed()
        await select_from_dropdown(
            page, lab, facility_settings["default_processing_lab"]
        )
        print("✅ Default processing lab set")
    except Exception as e:
        print(f"⚠️ Default Processing Lab error: {e}")

    await asyncio.sleep(0.5)
