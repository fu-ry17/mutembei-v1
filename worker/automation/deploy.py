import asyncio
import re
from typing import Any, Dict
from urllib.parse import quote

from playwright.async_api import async_playwright

MAX_ATTEMPTS = 5

RETRYABLE_ERRORS = [
    "API request timeout",
    "Please check the HMIS instance connectivity",
    "Unable to connect to the HMIS instance",
]


async def run_facility_deploy(job: Dict[str, Any]):
    credential = job["credential"]["encrypted_data"]
    credential_extra = job["credential"].get("extra", {})
    extra = job["extra"]

    LOGIN = {
        "url": credential_extra["url"],
        "email": credential["email"],
        "password": credential["password"],
    }

    FACILITY_NAME = extra["facility_name"]

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
                await page.wait_for_function(
                    "!window.location.hash.includes('/login')", timeout=15000
                )
                print("✅ Login successful")
            except Exception:
                raise RuntimeError("Login failed — invalid credentials or timeout")

            # 2. Open facility and update status
            await page.goto(
                f"{LOGIN['url'].rstrip('/#')}/app/facility-setup/{quote(FACILITY_NAME)}"
            )
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(3000)

            current_status = await page.evaluate("""() => {
                const selects = Array.from(document.querySelectorAll('select'));
                for (const s of selects) {
                    const val = s.options[s.selectedIndex]?.text ?? '';
                    if (/approved|submitted|draft|failed|in.?progress|deployed/i.test(val)) return val;
                }
                return null;
            }""")
            print(f"📋 Status: {current_status}")

            status_lower = (current_status or "").lower()
            if "deployed" in status_lower:
                print("✅ Already deployed — nothing to do.")
                return

            target_status = (
                "Approved" if "submitted" in status_lower else "Submitted for Review"
            )
            print(f"🔄 Changing status to '{target_status}'")

            await page.evaluate(f"""() => {{
                const s = Array.from(document.querySelectorAll('select'))
                    .find(s => Array.from(s.options).some(o => /approved|submitted/i.test(o.text)));
                if (!s) return;
                const match = Array.from(s.options).find(o => o.text.toLowerCase().includes('{target_status.lower()}'));
                if (match) {{
                    s.value = match.value;
                    s.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
            }}""")
            await page.wait_for_timeout(1000)

            await page.locator('button:has-text("Save")').click()
            await page.wait_for_timeout(2000)
            print("✅ Saved")

            # 3. Find facility and open editor
            facilities_url = LOGIN["url"].rstrip("/#") + "/#/facilities"
            await page.goto(facilities_url)
            await page.wait_for_load_state("networkidle")
            await page.fill('input[placeholder*="Search facilities" i]', FACILITY_NAME)
            await page.wait_for_timeout(3000)

            row = page.locator(f'tr:has-text("{FACILITY_NAME}")')
            if await row.count() == 0:
                raise RuntimeError(f"Facility '{FACILITY_NAME}' not found in list")

            await row.first.locator('button:has-text("Edit")').click()
            await page.wait_for_load_state("networkidle")
            print("✅ Opened facility editor")

            # 4. Navigate to last step and deploy
            await page.wait_for_selector(
                'button:has-text("Move to Last Step")', timeout=10000
            )
            await page.click('button:has-text("Move to Last Step")')
            await page.wait_for_load_state("networkidle")

            try:
                await page.wait_for_selector(
                    'button:has-text("Ready for Deployment")', timeout=5000
                )
                await page.click('button:has-text("Ready for Deployment")')
                await page.wait_for_timeout(2000)
            except Exception:
                pass  # optional button

            await click_deploy(page)
            print("🚀 Deployment started!")

            # 5. Monitor until 100% or error
            await monitor_deployment(page, FACILITY_NAME)

        finally:
            await browser.close()
            print("✅ Browser closed")


async def click_deploy(page):
    await page.wait_for_selector(
        'button:has-text("Complete Setup & Deploy")', timeout=10000
    )
    await page.click('button:has-text("Complete Setup & Deploy")')
    await page.wait_for_timeout(3000)
    print("✅ Clicked 'Complete Setup & Deploy'")


async def close_modal(page):
    closed = await page.evaluate("""() => {
        const el = Array.from(document.querySelectorAll('button, [role="button"], span, div'))
            .find(el => {
                const t = el.textContent.trim();
                const cls = el.className || '';
                const aria = el.getAttribute('aria-label') || '';
                return t === '×' || t === '✕' || t === 'Close'
                    || aria.toLowerCase().includes('close')
                    || cls.includes('close') || cls.includes('dismiss');
            });
        if (el) { el.click(); return true; }
        return false;
    }""")
    await page.wait_for_timeout(1500)
    if not closed:
        await page.keyboard.press("Escape")


async def monitor_deployment(page, facility_name: str):
    attempt = 0
    abbreviation_extra = 0
    last_percent = 0

    while attempt < MAX_ATTEMPTS:
        attempt += 1
        print(f"\n🔄 Attempt #{attempt} of {MAX_ATTEMPTS}")

        while True:
            if last_percent == 100:
                print("✅ 100% — doing final refresh and exiting...")
                await page.wait_for_timeout(2000)
                try:
                    await page.locator("text=Refresh").last.click(timeout=3000)
                    await page.wait_for_timeout(3000)
                except Exception:
                    pass
                return

            try:
                await page.wait_for_timeout(5000)

                # Reopen if modal closed mid-deploy
                if await page.locator('[class*="modal"], [role="dialog"]').count() == 0:
                    if last_percent >= 95:
                        print(
                            "✅ Modal closed after high progress — deployment complete!"
                        )
                        return
                    print("⚠️  Modal closed unexpectedly — retrying...")
                    last_percent = 0
                    await click_deploy(page)
                    break  # increments attempt

                # Refresh and read page
                try:
                    await page.locator("text=Refresh").last.click(timeout=3000)
                    await page.wait_for_timeout(1000)
                except Exception:
                    pass

                page_text = await page.evaluate("() => document.body.innerText")

                # Track progress
                matches = re.findall(r"\d+%", page_text)
                if matches:
                    percent = int(matches[0].replace("%", ""))
                    print(f"📊 Progress: {percent}%")
                    if percent > last_percent:
                        last_percent = percent
                    elif percent == 0 and last_percent >= 95:
                        print("✅ Progress reset after 95%+ — deployment complete!")
                        return

                # Abbreviation conflict
                if "Abbreviation already used for another company" in page_text:
                    print("⚠️  Abbreviation conflict — fixing...")
                    await page.wait_for_timeout(2000)
                    await close_modal(page)

                    await page.wait_for_selector(
                        'button:has-text("Move to First Step")', timeout=10000
                    )
                    await page.click('button:has-text("Move to First Step")')
                    await page.wait_for_load_state("networkidle")

                    abbreviation_extra += 1
                    new_abbr = facility_name.replace(" ", "")[
                        : 3 + abbreviation_extra
                    ].upper()

                    abbr_input = page.locator(
                        'input[placeholder*="ABC" i], input[placeholder*="abbreviation" i], input[placeholder*="bbrev" i]'
                    ).first
                    await abbr_input.wait_for(timeout=5000)
                    await abbr_input.click(click_count=3)
                    await abbr_input.fill(new_abbr)
                    await page.evaluate("""() => {
                        const input = document.querySelector('input[placeholder*="ABC" i], input[placeholder*="abbreviation" i]');
                        if (input) {
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }""")
                    print(f"✅ New abbreviation: '{new_abbr}'")

                    await page.wait_for_selector(
                        'button:has-text("Move to Last Step")', timeout=10000
                    )
                    await page.click('button:has-text("Move to Last Step")')
                    await page.wait_for_load_state("networkidle")
                    await click_deploy(page)
                    break  # increments attempt

                # Deployment failed
                if "Deployment Failed" in page_text:
                    retryable = next(
                        (e for e in RETRYABLE_ERRORS if e in page_text), None
                    )
                    if retryable:
                        print(
                            f"⚠️  Retryable error — retrying... ({attempt}/{MAX_ATTEMPTS})"
                        )
                        await page.wait_for_timeout(2000)
                        await close_modal(page)
                        await click_deploy(page)
                        break  # increments attempt
                    else:
                        error_lines = [
                            line.strip()
                            for line in page_text.splitlines()
                            if line.strip()
                            and any(
                                kw in line.lower()
                                for kw in [
                                    "failed",
                                    "error",
                                    "unable",
                                    "invalid",
                                    "exception",
                                ]
                            )
                        ]
                        print("💀 Non-retryable error — stopping.")
                        print(f"   Facility : {facility_name}")
                        print(f"   Attempt  : #{attempt}")
                        for line in error_lines:
                            print(f"   → {line}")
                        raise RuntimeError(
                            f"Non-retryable deployment failure for '{facility_name}'"
                        )

            except Exception as e:
                if "TargetClosedError" in type(e).__name__ or "Target page" in str(e):
                    print("✅ Page closed by app — deployment complete!")
                    return
                raise

    raise RuntimeError(
        f"Exhausted {MAX_ATTEMPTS} attempts for '{facility_name}' — last progress: {last_percent}%"
    )
