document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.querySelector(".login");

  if (!loginButton) return;

  const modal = document.createElement("div");
  modal.className = "auth-modal";
  modal.innerHTML = `
    <div class="auth-box">
      <button class="auth-close" type="button">&times;</button>

      <div class="auth-tabs">
        <button class="auth-tab active" data-mode="login">ورود</button>
        <button class="auth-tab" data-mode="register">ثبت‌نام</button>
      </div>

      <div id="authMessage"></div>

      <form id="authForm">

        <div id="registerFields" style="display:none;">
          <label>نام و نام خانوادگی</label>
          <input type="text" id="full_name" placeholder="نام و نام خانوادگی">

          <label>ایمیل</label>
          <input type="email" id="email" placeholder="example@email.com">

          <label>زبان مورد نظر</label>
          <select id="language">
            <option value="">انتخاب زبان</option>
            <option value="English">انگلیسی</option>
            <option value="German">آلمانی</option>
            <option value="French">فرانسه</option>
            <option value="Korean">کره‌ای</option>
          </select>

          <label>سطح زبان</label>
          <select id="level">
            <option value="">انتخاب سطح</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>

          <label>هدف شما</label>
          <input type="text" id="goal" placeholder="مثلاً مکالمه، مهاجرت، آزمون...">
        </div>

        <label>شماره موبایل</label>
        <input type="tel" id="phone" placeholder="09xxxxxxxxx" required>

        <label>رمز عبور</label>
        <input type="password" id="password" placeholder="رمز عبور" required>

        <button class="auth-submit" type="submit">ورود</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const style = document.createElement("style");
  style.textContent = `
    .auth-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }

    .auth-modal.show {
      display: flex;
    }

    .auth-box {
      width: 100%;
      max-width: 430px;
      max-height: 90vh;
      overflow-y: auto;
      background: #fff;
      border-radius: 22px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      direction: rtl;
      position: relative;
    }

    .auth-close {
      position: absolute;
      top: 12px;
      left: 15px;
      border: 0;
      background: transparent;
      font-size: 30px;
      cursor: pointer;
    }

    .auth-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 22px;
    }

    .auth-tab {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      background: #f5f5f5;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
    }

    .auth-tab.active {
      background: #111;
      color: white;
    }

    #authForm label {
      display: block;
      margin: 12px 0 6px;
      font-weight: 600;
    }

    #authForm input,
    #authForm select {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 15px;
    }

    .auth-submit {
      width: 100%;
      margin-top: 20px;
      padding: 13px;
      border: 0;
      border-radius: 10px;
      background: #111;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }

    #authMessage {
      margin-bottom: 10px;
      font-size: 14px;
    }
  `;

  document.head.appendChild(style);

  const tabs = modal.querySelectorAll(".auth-tab");
  const registerFields = modal.querySelector("#registerFields");
  const submitButton = modal.querySelector(".auth-submit");
  const form = modal.querySelector("#authForm");
  const message = modal.querySelector("#authMessage");

  let mode = "login";

  function setMode(newMode) {
    mode = newMode;

    tabs.forEach(tab => {
      tab.classList.toggle(
        "active",
        tab.dataset.mode === newMode
      );
    });

    registerFields.style.display =
      newMode === "register" ? "block" : "none";

    submitButton.textContent =
      newMode === "register" ? "ثبت‌نام" : "ورود";

    message.textContent = "";
  }

  loginButton.addEventListener("click", () => {
    modal.classList.add("show");
    setMode("login");
  });

  modal.querySelector(".auth-close").addEventListener("click", () => {
    modal.classList.remove("show");
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.remove("show");
    }
  });

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      setMode(tab.dataset.mode);
    });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    message.textContent = "لطفاً صبر کنید...";

    const phone = modal.querySelector("#phone").value.trim();
    const password = modal.querySelector("#password").value.trim();

    let endpoint;
    let data;

    if (mode === "login") {
      endpoint = "/api/login";

      data = {
        mobile: phone,
        password: password
      };
    } else {
      endpoint = "/api/register";

      data = {
        full_name: modal.querySelector("#full_name").value.trim(),
        phone: phone,
        email: modal.querySelector("#email").value.trim(),
        language: modal.querySelector("#language").value,
        goal: modal.querySelector("#goal").value.trim(),
        level: modal.querySelector("#level").value,
        password: password
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        message.textContent =
          result.message || "خطایی رخ داد.";
        return;
      }

      message.textContent =
        result.message || "عملیات با موفقیت انجام شد.";

      if (result.redirect) {
        setTimeout(() => {
          window.location.href = result.redirect;
        }, 500);
      }

    } catch (error) {
      console.error(error);
      message.textContent =
        "ارتباط با سرور برقرار نشد.";
    }
  });
});
