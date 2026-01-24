import os
import re
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeoutError

BIRTHDAY_URL = "https://www.linkedin.com/mynetwork/catch-up/birthday/"
WORK_ANNIV_URL = "https://www.linkedin.com/mynetwork/catch-up/work_anniversaries/"
JOB_CHANGES_URL = "https://www.linkedin.com/mynetwork/catch-up/job_changes/"
LOGIN_URL = "https://www.linkedin.com/login"
PROFILE_DIR = "pw_linkedin_profile"

# ===== GLOBAL CONFIG =====
MESSAGE_TEXT = "Wishing you a very happy birthday! 🎉"
MAX_MESSAGES_PER_RUN = 20

# Work anniversary message template (we will fill {years})
WORK_ANNIV_TEMPLATE = "Congrats on your {years} year work anniversary! 🎉"

# ⏱ Global wait for next action
WAIT_BETWEEN_ACTIONS_MS = 5_000
# =========================


def is_logged_in(page) -> bool:
    url = (page.url or "").lower()
    if "linkedin.com/login" in url or "checkpoint" in url or "challenge" in url:
        return False

    candidates = [
        'input[placeholder*="Search"]',
        'input[aria-label*="Search"]',
        'header',
        'nav[aria-label="Primary"]',
    ]
    for sel in candidates:
        try:
            if page.locator(sel).first.is_visible(timeout=1200):
                return True
        except Exception:
            pass
    return False


def login_with_credentials(page):
    email = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")

    if not email or not password:
        raise RuntimeError(
            "Missing env vars.\n"
            'Set like:\n'
            '$env:LINKEDIN_EMAIL="you@example.com"\n'
            '$env:LINKEDIN_PASSWORD="password"\n'
        )

    page.goto(LOGIN_URL, wait_until="domcontentloaded")

    page.locator("#username").wait_for(state="visible", timeout=20000)
    page.locator("#username").fill(email)

    page.locator("#password").wait_for(state="visible", timeout=20000)
    page.locator("#password").fill(password)

    page.locator('button[aria-label="Sign in"][type="submit"]').click()
    page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)

    url = (page.url or "").lower()
    if "checkpoint" in url or "challenge" in url:
        print("\n⚠️ Verification required.")
        print("Complete OTP / email verification in the browser.")
        input("Press Enter AFTER verification is complete...")
        page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)


def close_message_overlay(page):
    """
    Robustly close LinkedIn message overlay:
    - Targets the close button that contains svg[data-test-icon="close-small"]
    - Scrolls into view if needed
    - Uses click(force=True) as fallback
    - Falls back to pressing Escape
    """
    try:
        close_btn = page.locator(
            'button.msg-overlay-bubble-header__control:has(svg[data-test-icon="close-small"])'
        ).first

        if close_btn.count() > 0:
            try:
                close_btn.scroll_into_view_if_needed(timeout=3000)
            except Exception:
                pass

            try:
                close_btn.click(timeout=3000)
                return
            except Exception:
                pass

            try:
                close_btn.click(timeout=3000, force=True)
                return
            except Exception:
                pass

        alt_close = page.locator(
            'button.msg-overlay-bubble-header__control:has-text("Close your draft conversation")'
        ).first

        if alt_close.count() > 0:
            try:
                alt_close.scroll_into_view_if_needed(timeout=3000)
            except Exception:
                pass

            try:
                alt_close.click(timeout=3000)
                return
            except Exception:
                alt_close.click(timeout=3000, force=True)
                return

        page.keyboard.press("Escape")

    except PWTimeoutError:
        pass
    except Exception:
        pass


def _open_message_overlay_from_card(card) -> bool:
    """
    Clicks the 'Message' CTA inside a nurture-card.
    Returns True if clicked, False otherwise.
    """
    msg_link = card.locator('a[data-view-name="nurture-card-primary-button"]').first
    if msg_link.count() == 0:
        return False

    try:
        msg_link.scroll_into_view_if_needed()
    except Exception:
        pass

    msg_link.click()
    return True


def _type_send_wait_then_close(page, message_text: str):
    """
    Your current approach: don't type custom message.
    Just press Enter to send LinkedIn's prefilled message (body=...),
    wait, then close the overlay.
    """

    # KEDAR Remove below line for custom message
    # editor = page.locator('div.msg-form__contenteditable[contenteditable="true"][role="textbox"]')
    # editor.wait_for(state="visible", timeout=15000)
    # editor.click()
    # page.keyboard.press("Control+A")
    # page.keyboard.press("Backspace")
    # editor.type(message_text, delay=30)

    # ⏎ Press Enter to SEND the message
    page.keyboard.press("Enter")

    print("📤 Message sent, waiting before closing...")
    page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)

    close_message_overlay(page)
    page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)


def send_birthday_messages(page):
    today_cards = page.locator(
        'div[data-view-name="nurture-card"]',
        has=page.locator("strong", has_text="today"),
    )

    total = today_cards.count()
    print(f"\n🎂 Found {total} birthday card(s) with 'today'.")

    sent = 0
    for i in range(total):
        if sent >= MAX_MESSAGES_PER_RUN:
            print(f"\n🛑 Safety cap reached ({MAX_MESSAGES_PER_RUN}).")
            break

        card = today_cards.nth(i)

        try:
            if not _open_message_overlay_from_card(card):
                continue

            page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)

            _type_send_wait_then_close(page, MESSAGE_TEXT)

            sent += 1
            print(f"[{i+1}/{total}] ✅ Birthday message sent ({sent}).")

        except PWTimeoutError:
            print(f"[{i+1}/{total}] ⚠️ Message box timeout.")
            close_message_overlay(page)
        except Exception as e:
            print(f"[{i+1}/{total}] ⚠️ Error: {e}")
            close_message_overlay(page)

    print(f"\n✅ Birthdays done. Messages sent: {sent}")


def _extract_years_from_card(card) -> int | None:
    """
    Extracts years from nurture-card text like:
    'Completed 1 year at ...' or 'Completed 5 years at ...'
    """
    try:
        text = card.inner_text(timeout=3000)
    except Exception:
        return None

    m = re.search(r"\bCompleted\s+(\d+)\s+year", text, flags=re.IGNORECASE)
    if not m:
        return None

    try:
        return int(m.group(1))
    except Exception:
        return None


def send_work_anniversary_messages(page):
    cards = page.locator('div[data-view-name="nurture-card"]')
    total = cards.count()
    print(f"\n🏆 Found {total} work anniversary card(s).")

    sent = 0
    for i in range(total):
        if sent >= MAX_MESSAGES_PER_RUN:
            print(f"\n🛑 Safety cap reached ({MAX_MESSAGES_PER_RUN}).")
            break

        card = cards.nth(i)
        years = _extract_years_from_card(card)

        # Only message cards where years are present in the nurture-card
        if years is None:
            continue

        msg = WORK_ANNIV_TEMPLATE.format(years=years)

        try:
            if not _open_message_overlay_from_card(card):
                continue

            page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)

            _type_send_wait_then_close(page, msg)

            sent += 1
            print(f"[{i+1}/{total}] ✅ Work anniversary message sent ({sent}) for {years} year(s).")

        except PWTimeoutError:
            print(f"[{i+1}/{total}] ⚠️ Message box timeout.")
            close_message_overlay(page)
        except Exception as e:
            print(f"[{i+1}/{total}] ⚠️ Error: {e}")
            close_message_overlay(page)

    print(f"\n✅ Work anniversaries done. Messages sent: {sent}")


def _is_job_change_card(card) -> bool:
    """
    Job changes cards usually contain text like:
    - "Started a new position as ..."
    - "Started a new position at ..."
    We'll detect by text.
    """
    try:
        text = card.inner_text(timeout=2000)
    except Exception:
        return False

    patterns = [
        r"\bStarted a new position\b",
        r"\bStarted a new role\b",
        r"\bStarting a new position\b",
    ]
    return any(re.search(p, text, flags=re.IGNORECASE) for p in patterns)


def send_job_change_messages(page):
    cards = page.locator('div[data-view-name="nurture-card"]')
    total = cards.count()
    print(f"\n🧑‍💼 Found {total} job change card(s).")

    sent = 0
    for i in range(total):
        if sent >= MAX_MESSAGES_PER_RUN:
            print(f"\n🛑 Safety cap reached ({MAX_MESSAGES_PER_RUN}).")
            break

        card = cards.nth(i)

        # Only message actual "job change" cards
        if not _is_job_change_card(card):
            continue

        try:
            if not _open_message_overlay_from_card(card):
                continue

            page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)

            # We rely on LinkedIn's prefilled message (body=... in the CTA URL)
            _type_send_wait_then_close(page, "unused")

            sent += 1
            print(f"[{i+1}/{total}] ✅ Job change message sent ({sent}).")

        except PWTimeoutError:
            print(f"[{i+1}/{total}] ⚠️ Message box timeout.")
            close_message_overlay(page)
        except Exception as e:
            print(f"[{i+1}/{total}] ⚠️ Error: {e}")
            close_message_overlay(page)

    print(f"\n✅ Job changes done. Messages sent: {sent}")


def run():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=False,
            viewport={"width": 1400, "height": 900},
        )
        page = context.new_page()

        # Go to birthdays first (will redirect to login if needed)
        page.goto(BIRTHDAY_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)

        if not is_logged_in(page):
            print("🔐 Logging in...")
            login_with_credentials(page)

        # ===== Birthdays =====
        page.goto(BIRTHDAY_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)
        send_birthday_messages(page)

        # ===== Work anniversaries =====
        page.goto(WORK_ANNIV_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)
        send_work_anniversary_messages(page)

        # ===== Job changes =====
        page.goto(JOB_CHANGES_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(WAIT_BETWEEN_ACTIONS_MS)
        send_job_change_messages(page)

        context.close()


if __name__ == "__main__":
    run()
