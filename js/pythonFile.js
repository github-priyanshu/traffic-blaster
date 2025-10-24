function downloadPythonCode(){

var  file=`from playwright.sync_api import sync_playwright
import time, random, math

# -------------------------------
# Config
# -------------------------------
keyword = "${variables.keyword}"
target_site = "${variables.domain}"

sendingTraffic=1
ratio = {"mobile": ${variables.mobile}, "tablet": ${variables.tablet}, "desktop": ${variables.desktop}}

clicks = ${variables.clicks}



# 🔧 Tunable speed variables
SCROLL_SPEED = .5          # overall reading speed (0.5 = slower, 2.0 = faster)
PARAGRAPH_SCROLL_STEP = 80  # px per step when moving to next paragraph
READING_SCROLL_STEP = 3    # px drift while "reading"

proxies = ${variables.proxy}


proxy_index = 0  # Start from the first proxy
def get_next_proxy():
    global proxy_index, proxies
    proxy = proxies[proxy_index]
    proxy_index = (proxy_index + 1) % len(proxies)  # Loop back to start
    print(proxy)
    return proxy



class HumanScroll:
    def __init__(self, page):
        self.page = page
        # detect device
        try:
            self.ua = page.evaluate("() => navigator.userAgent") or ""
        except:
            self.ua = ""
        self.is_touch = any(word in self.ua for word in ["Mobile", "Android", "iPhone", "iPad"])

        # 🔧 Tunable speed variables
        self.SCROLL_SPEED = 1.0           # 0.5 = slow, 2.0 = fast
        self.PARAGRAPH_SCROLL_STEP = 80   # px per step when moving to next paragraph
        self.READING_SCROLL_STEP = 3      # px drift while reading
        self.SKIP_CHANCE = 0.25           # chance to skip some paragraphs
        self.DEBUG = False

    # Helper: scroll delta (touch vs mouse)
    def _scroll(self, delta_y):
        if self.is_touch:
            # emulate swipe (down = scroll up)
            start_x = random.randint(100, 300)
            start_y = random.randint(500, 700)
            end_y = start_y - delta_y
            self.page.mouse.move(start_x, start_y)
            self.page.mouse.down()
            self.page.mouse.move(start_x, end_y, steps=8)
            self.page.mouse.up()
        else:
            self.page.mouse.wheel(0, delta_y)

    # --------------------------------
    # scroll.read(selector, timeToRead)
    # --------------------------------
    def read(self, selector="body", timeToRead=None):
        elements = self.page.query_selector_all(f"{selector} p, {selector} h1, {selector} h2, {selector} h3, {selector} img")
        if not elements:
            print(f"❌ No readable content found in {selector}")
            return

        if self.DEBUG:
            print(f"📄 Found {len(elements)} content blocks")

        total_start = time.time()
        for el in elements:
            if random.random() < self.SKIP_CHANCE:
                continue

            try:
                tag = el.evaluate("el => el.tagName.toLowerCase()")
                text = el.inner_text() if tag != "img" else "[image]"
                words = len(text.split()) if text else 0

                # move to element smoothly
                box = el.bounding_box()
                if box:
                    target_y = box["y"] - random.randint(50, 120)
                    current_y = self.page.evaluate("() => window.scrollY")
                    while current_y < target_y:
                        step = random.randint(self.PARAGRAPH_SCROLL_STEP-20, self.PARAGRAPH_SCROLL_STEP+20)
                        self._scroll(step)
                        time.sleep(random.uniform(0.05, 0.12) / self.SCROLL_SPEED)
                        current_y = self.page.evaluate("() => window.scrollY")

                # estimate read time
                base_time = words / (3 * self.SCROLL_SPEED)
                read_time = min(12, max(1.5, base_time))
                if timeToRead:  # hard limit mode
                    remaining = timeToRead - (time.time() - total_start)
                    if remaining <= 0:
                        break
                    read_time = min(read_time, remaining)

                if self.DEBUG:
                    print(f"👀 Reading {tag} ({words} words) for ~{read_time:.1f}s")

                # small drifts while reading
                start = time.time()
                direction = 1
                while time.time() - start < read_time:
                    drift = random.randint(self.READING_SCROLL_STEP-5, self.READING_SCROLL_STEP+5) * direction
                    self._scroll(drift)
                    time.sleep(random.uniform(0.3, 0.7) / self.SCROLL_SPEED)
                    if random.random() < 0.07:
                        direction *= -1

            except Exception:
                continue

        # gentle end scroll up
        for _ in range(random.randint(3, 6)):
            self._scroll(-40)
            time.sleep(random.uniform(0.1, 0.3))

        if self.DEBUG:
            print("✅ Finished human-like reading scroll.")

    # -------------------------------
    # scroll.goto(selector, steps)
    # -------------------------------
    def goto(self, selector, steps=None):
        if(isinstance(selector,str)):
            el = self.page.query_selector(selector)
        else:
            el=selector
        if not el:
            print(f"❌ Element {selector} not found")
            return
        box = el.bounding_box()
        if not box:
            return

        target_y = box["y"] - self.page.viewport_size["height"] / 2
        current_y = self.page.evaluate("() => window.scrollY")
        distance = target_y - current_y
        steps = steps or max(3, int(abs(distance) / 300))

        for i in range(steps):
            jitter = random.uniform(-10, 10)
            delta = (distance / steps) + jitter
            self._scroll(delta)
            time.sleep(random.uniform(0.04, 0.1) / self.SCROLL_SPEED)

        if self.DEBUG:
            print(f"✅ Smoothly scrolled to {selector}")




# from humanmousemove module
def generate_human_cursor_path(
    x1, y1, x2, y2, *,
    seed=None,
    overshoot_chance=1,     # chance to go a little past the target, then correct
    curve_chance=1,        # chance to introduce a gentle curve
    jitter_px=1.2,            # small hand jitter (px)
    min_steps=12,             # safety minimum
    max_steps=3000,           # safety maximum
    return_times=False,       # if True: returns (x, y, dt_ms) for each step
    dedupe=True               # remove repeated consecutive points after rounding
    ):
    """
    Generate a human-like cursor trajectory from (x1,y1) to (x2,y2).

    Returns:
        [(x, y), ...] by default, or [(x, y, dt_ms), ...] if return_times=True.
        Points start at (x1,y1) and end exactly at (x2,y2).
    """
    rng = random.Random(seed)
    dx, dy = x2 - x1, y2 - y1
    dist = math.hypot(dx, dy)
    if dist < 1e-6:
        return ([(int(round(x2)), int(round(y2)), 0)]
                if return_times else [(int(round(x2)), int(round(y2)))])

    # Unit vectors: along the path (u) and perpendicular (p)
    ux, uy = dx / dist, dy / dist
    px, py = -uy, ux

    # --- Steps depend on distance: choose pixels/step randomly ~[3..7] ---
    px_per_step = rng.uniform(2.0, 4.0)
    steps = int(max(min_steps, min(max_steps, dist / px_per_step)))
    steps = int(steps * rng.uniform(0.9, 1.1))           # small variability
    steps = max(min_steps, min(max_steps, steps))

    # --- Randomized overall speed -> total duration (ms) if requested ---
    speed_px_per_ms = rng.uniform(0.6, 1.5)              # ~600–1500 px/s
    total_ms = dist / speed_px_per_ms
    total_ms *= rng.uniform(0.85, 1.25)

    # --- Minimum-jerk easing (smooth accel/decel) ---
    def min_jerk(t):  # t in [0,1] -> position fraction in [0,1]
        return t**3 * (10 + t * (-15 + 6*t))

    # Quadratic Bézier point
    def qbez(p0, p1, p2, t):
        (x0, y0), (x1_, y1_), (x2_, y2_) = p0, p1, p2
        mt = 1.0 - t
        return (mt*mt*x0 + 2*mt*t*x1_ + t*t*x2_, mt*mt*y0 + 2*mt*t*y1_ + t*t*y2_)

    # Sample a segment with min-jerk progress mapped into global progress window
    def sample_segment(p0, p1, p2, n, t_start, t_end):
        pts, progs = [],[]
        for i in range(1, n + 1):
            t_lin = i / (n + 1)
            t_lin = min(1.0, max(0.0, t_lin + rng.gauss(0, 0.02)))  # tiny micro-variation
            t_ease = min_jerk(t_lin)
            x, y = qbez(p0, p1, p2, t_ease)
            prog = t_start + (t_end - t_start) * t_ease
            pts.append((x, y))
            progs.append(prog)
        return pts, progs

    do_overshoot = rng.random() < overshoot_chance and dist > 20
    do_curve = rng.random() < curve_chance

    points, progress = [], []

    if do_overshoot:
        # Overshoot by ~2–8% (capped)
        overshoot_ratio = min(0.12, max(0.02, rng.gauss(0.045, 0.02)))
        ovec = (ux * dist * overshoot_ratio, uy * dist * overshoot_ratio)
        p_ov = (x2 + ovec[0], y2 + ovec[1])

        # Allocate extra steps for overshoot correction
        steps = int(steps * 1.15)
        main_steps = max(8, int(steps * rng.uniform(0.70, 0.88)))
        corr_steps = max(6, steps - main_steps)

        # Curve amplitude (perpendicular offset)
        curve_amp = 0.0
        if do_curve:
            curve_amp = min(120.0, dist * rng.uniform(0.05, 0.15))
            if rng.random() < 0.5: curve_amp *= -1

        c1 = ((x1 + p_ov[0]) * 0.5 + px * curve_amp,
              (y1 + p_ov[1]) * 0.5 + py * curve_amp)

        seg1_pts, seg1_prog = sample_segment((x1, y1), c1, p_ov, main_steps, 0.0, 0.86)
        points += seg1_pts; progress += seg1_prog

        # Correction back to target: smaller opposite curve
        corr_amp = -curve_amp * rng.uniform(0.25, 0.6)
        c2 = ((p_ov[0] + x2) * 0.5 + px * corr_amp,
              (p_ov[1] + y2) * 0.5 + py * corr_amp)

        seg2_pts, seg2_prog = sample_segment(p_ov, c2, (x2, y2), corr_steps, 0.86, 1.0)
        points += seg2_pts; progress += seg2_prog

    else:
        # Single curved segment
        curve_amp = 0.0
        if do_curve:
            curve_amp = min(120.0, dist * rng.uniform(0.04, 0.12))
            if rng.random() < 0.5: curve_amp *= -1
        c = ((x1 + x2) * 0.5 + px * curve_amp,
             (y1 + y2) * 0.5 + py * curve_amp)
        seg_pts, seg_prog = sample_segment((x1, y1), c, (x2, y2), steps, 0.0, 1.0)
        points += seg_pts; progress += seg_prog

    # Add small hand jitter (mostly mid-path; fade near start/end)
    out_pts, out_prog = [], []
    for (x, y), prog in zip(points, progress):
        edge = abs(0.5 - prog) * 2.0      # 1 at edges, 0 at middle
        jitter_scale = 1.0 - edge * 0.7   # reduce jitter near edges
        j_perp = rng.gauss(0, jitter_px) * jitter_scale
        j_par  = rng.gauss(0, jitter_px * 0.3) * jitter_scale
        xj = x + px * j_perp + ux * j_par
        yj = y + py * j_perp + uy * j_par
        xi, yi = int(round(xj)), int(round(yj))
        if not dedupe or (not out_pts or (xi, yi) != out_pts[-1]):
            out_pts.append((xi, yi))
            out_prog.append(prog)

    # Ensure exact start and end
    sx, sy = int(round(x1)), int(round(y1))
    ex, ey = int(round(x2)), int(round(y2))
    if not out_pts or out_pts[0] != (sx, sy):
        out_pts.insert(0, (sx, sy)); out_prog.insert(0, 0.0)
    if out_pts[-1] != (ex, ey):
        out_pts.append((ex, ey)); out_prog.append(1.0)

    if not return_times:
        return out_pts

    # Map normalized progress -> millisecond delays (per step), strictly increasing
    times_ms = [int(round(p * total_ms)) for p in out_prog]
    for i in range(1, len(times_ms)):
        if times_ms[i] <= times_ms[i - 1]:
            times_ms[i] = times_ms[i - 1] + rng.randint(1, 3)
    dts = [times_ms[0]] + [times_ms[i] - times_ms[i-1] for i in range(1, len(times_ms))]
    return [(x, y, dt) for (x, y), dt in zip(out_pts, dts)]


# -------------------------------
# Function 1: Type like a human
# -------------------------------
def typeLikeHuman(element, txt):
    for ch in txt:
        element.type(ch, delay=random.randint(50, 250))  # 50–250ms delay per key
    print(f"Typed '{txt}' like a human")

# -------------------------------
# Function 2: Move mouse like a human
# -------------------------------
mousePosi = {"x": 0, "y": 0}

def human_mouse_move(page, target_x, target_y):
    mouse = page.mouse
    path = generate_human_cursor_path(
        mousePosi['x'], mousePosi['y'], target_x, target_y, return_times=True
    )
    for pt in path:
        mouse.move(pt[0], pt[1])
        time.sleep(pt[2]/1000)
    mousePosi['x'], mousePosi['y'] = target_x, target_y
    print(f"Moved mouse to ({target_x}, {target_y}) like a human")


userAgents = {
    "mobile": [
        {"user_agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", "viewport": {"width": 412, "height": 915}},
        {"user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.101 Mobile/15E148 Safari/604.1", "viewport": {"width": 390, "height": 844}},
        {"user_agent": "Mozilla/5.0 (Linux; Android 12; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36", "viewport": {"width": 412, "height": 892}},
        {"user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.92 Mobile/15E148 Safari/604.1", "viewport": {"width": 375, "height": 812}},
        {"user_agent": "Mozilla/5.0 (Linux; Android 11; OnePlus 9R) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", "viewport": {"width": 412, "height": 915}},
    ],
    "tablet": [
        {"user_agent": "Mozilla/5.0 (iPad; CPU OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.101 Mobile/15E148 Safari/604.1", "viewport": {"width": 810, "height": 1080}},
        {"user_agent": "Mozilla/5.0 (Linux; Android 13; SM-X906B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "viewport": {"width": 1280, "height": 800}},
        {"user_agent": "Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.5993.92 Mobile/15E148 Safari/604.1", "viewport": {"width": 834, "height": 1112}},
        {"user_agent": "Mozilla/5.0 (Linux; Android 12; Lenovo TB-J706F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", "viewport": {"width": 1200, "height": 800}},
        {"user_agent": "Mozilla/5.0 (iPad; CPU OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/117.0.5938.132 Mobile/15E148 Safari/604.1", "viewport": {"width": 820, "height": 1180}},
    ],
    "desktop": [
        {"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "viewport": {"width": 1366, "height": 768}},
        {"user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15", "viewport": {"width": 1440, "height": 900}},
        {"user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", "viewport": {"width": 1920, "height": 1080}},
        {"user_agent": "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "viewport": {"width": 1600, "height": 900}},
        {"user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36", "viewport": {"width": 1680, "height": 1050}},
        {"user_agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "viewport": {"width": 1366, "height": 768}},
        {"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Chrome/118.0", "viewport": {"width": 1536, "height": 864}},
        {"user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "viewport": {"width": 2560, "height": 1440}},
    ]
}


def get_user_agent_by_ratio(ratio=None):
    """
    ratio example: {"mobile": 20, "tablet": 10, "desktop": 70}
    returns a random user-agent based on weight.
    """
    if ratio is None:
        ratio = {"mobile": 20, "tablet": 10, "desktop": 70}

    # Flatten selection pool with weighting
    weighted_list = []
    for device_type, weight in ratio.items():
        weighted_list += [device_type] * weight

    chosen_device = random.choice(weighted_list)
    selected_ua = random.choice(userAgents[chosen_device])
    return selected_ua

# print(get_user_agent_by_ratio())

for click in clicks:
    print(f"====================Send traffic number -- {sendingTraffic}=======================")
    print(f"====================Send Data : {click}=======================")
    delayOnMainPage=click["delayOnMainPage"]
    with sync_playwright() as p:
        # browser = p.chromium.launch(headless=False)
        browser = p.chromium.launch(headless=False,proxy=get_next_proxy())
        uax=get_user_agent_by_ratio(ratio)
        print(uax)
        context = browser.new_context(
            user_agent=uax['user_agent'],
            viewport=uax["viewport"],
        )

        page = context.new_page()
        page.goto("https://bing.com")

        page.wait_for_selector("#trending_now_tile")
        

        # Input box
        input_box = page.wait_for_selector("#sb_form_q")
        body = page.wait_for_selector("body")

        if body:
            bodySize = body.bounding_box()
            mousePosi["x"] = random.randint(0, math.floor(bodySize['width']))
            mousePosi["y"] = random.randint(0, 900)

        box = input_box.bounding_box()
        if box:
            human_mouse_move(page, box["x"] + box["width"]/2, box["y"] + box["height"]/2)
            time.sleep(.3)

        input_box.click(force=True)
        time.sleep(random.uniform(.6, 1))
        typeLikeHuman(input_box, keyword)
        input_box.press("Enter")

        page.wait_for_selector("cite",timeout=180000)

        print("✅ Page content loaded (text present)")

        # Search results
        results = page.query_selector_all("cite")
        found = False

        for el in results:
            href = el.inner_text().strip()
            print("Found:", href)

            if target_site not in href:
                continue   # ✅ valid here

            # ✅ Fresh check before clicking
            target_element = el

            box = target_element.bounding_box()
            if not box:
                print("⚠️ Element has no bounding box, skipping...")
                continue  # ✅ valid here
            
            try:
                # Scroll to element and move mouse
                HumanScroll(page).goto(target_element)
                human_mouse_move(page, box["x"] + box["width"]/2, box["y"] + box["height"]/2)
                time.sleep(random.uniform(1,2))
                try:
                    # ✅ Try new tab
                    
                    with context.expect_page(timeout=5000) as new_page_info:
                        target_element.click()
                    new_page = new_page_info.value
                except:
                    # ✅ Same tab fallback
                    target_element.click()
                    new_page = page

    
                new_page.wait_for_selector("body", state="attached")
                new_page.wait_for_function("document.body.innerText.trim().length > 0")
                print(f"Reading Body for: {click['delayOnMainPage']}s")


                pageScroll = HumanScroll(new_page)
                pageScroll.read("body", delayOnMainPage)
                sendingTraffic+=1
                print("||||||||||||ENDS|||||||||||")
                print(f"waiting for {click['delayAfter']}s to go next")
                found = True
                break

            except Exception as e:
                print("⚠️ Click failed:", e)
                continue  # ✅ valid here

        if not found:
            print(f"❌ Target site '{target_site}' not found in results.")


        time.sleep(2)
        browser.close()
    time.sleep(click["delayAfter"])

"""
Documentation to use 
HumanScroll


    scroller = HumanScroll(page)
    scroller.DEBUG = True
    scroller.SCROLL_SPEED = 0.8

    scroller.read("body", timeToRead=20) # if second parameter is not give then its adaptive
    scroller.goto("footer", steps=4) # if second parameter is not give then its adaptive with max 3
"""`

    downloadStringAsFile(variables.title+"-"+variables.viewsCount+"-"+variables.domain+".py",file);
}

function downloadStringAsFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const downloadLink = document.createElement('a');
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(blob);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  window.URL.revokeObjectURL(downloadLink.href);
}