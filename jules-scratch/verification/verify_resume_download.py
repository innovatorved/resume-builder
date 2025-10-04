from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000")

        # Get the navigation container to scope the button search
        nav_container = page.locator("div.fixed.bottom-0")

        # Click through the form to get to the resume preview
        for _ in range(8):
            # Find the "Next" button within the navigation container
            next_button = nav_container.get_by_role("button", name="Next")
            expect(next_button).to_be_visible()
            next_button.click()

        # Click the "View Resume" button, also in the nav container
        view_resume_button = nav_container.get_by_role("button", name="View Resume")
        expect(view_resume_button).to_be_visible()
        view_resume_button.click()

        # Wait for the preview to load and take a screenshot
        expect(page.get_by_text("Resume Preview")).to_be_visible(timeout=10000)
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)