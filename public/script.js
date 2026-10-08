document.addEventListener("DOMContentLoaded", () => {

  const loginButton = document.querySelector(".login");

  if (!loginButton) {
    console.log("Login button not found");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "auth-modal";

  modal.innerHTML = `
    <div class="auth-box">

      <button class="auth-close" type="button">&times;</button>

      <h2 id="authTitle">ورود به حساب</h2>

      <div class="auth-tabs">

        <button type="button" class="auth-tab active" data-mode="login">
          ورود
        </button>

        <button type="button" class="auth-tab" data-mode="register">
          ثبت‌نام
        </button>

      </div>

      <div id="authMessage"></div>

      <form id="authForm">

        <div id="registerFields" style="display:none;">

          <label>نام و نام خانوادگی</label>
          <input type="text" id="full_name">

          <label>ایمیل</label>
          <input type="email" id="email">

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
          <input type="text" id="goal">

        </div>

        <label>شماره موبایل</label>
        <input type="tel" id="phone" required>

        <label>رمز عبور</label>
        <input type="password" id="password" required>

        <button class="auth-submit" type="submit">
          ورود
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(modal);


  /* =========================
     STYLE
  ========================= */

  const style = document.createElement("style");

  style.textContent = `

    .auth-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.6);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 99999;
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
      background: white;
      border-radius: 22px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
      direction: rtl;
      position: relative;
    }

    .auth-close {
      position: absolute;
      top: 10px;
      left: 15px;
      border: 0;
      background: transparent;
      font-size: 30px;
      cursor: pointer;
    }

    .auth-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .auth-tab {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      background: #f5f5f5;
      border-radius: 10px;
      cursor: pointer;
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
      text-align: center;
    }

  `;

  document.head.appendChild(style);


  /* =========================
     ELEMENTS
  ========================= */

  const tabs = modal.querySelectorAll(".auth-tab");

  const registerFields =
    modal.querySelector("#registerFields");

  const submitButton =
    modal.querySelector(".auth-submit");

  const form =
    modal.querySelector("#authForm");

  const message =
    modal.querySelector("#authMessage");

  const title =
    modal.querySelector("#authTitle");

  let mode = "login";


  /* =========================
     MODE
  ========================= */

  function setMode(newMode) {

    mode = newMode;

    tabs.forEach(tab => {

      tab.classList.toggle(
        "active",
        tab.dataset.mode === newMode
      );

    });

    if (newMode === "register") {

      registerFields.style.display = "block";

      title.textContent =
        "ایجاد حساب کاربری";

      submitButton.textContent =
        "ثبت‌نام";

    } else {

      registerFields.style.display =
        "none";

      title.textContent =
        "ورود به حساب";

      submitButton.textContent =
        "ورود";

    }

    message.textContent = "";

  }


  /* =========================
     OPEN
  ========================= */

  loginButton.addEventListener("click", (event) => {

    event.preventDefault();

    modal.classList.add("show");

    setMode("login");

  });


  /* =========================
     CLOSE
  ========================= */

  modal.querySelector(".auth-close")
    .addEventListener("click", () => {

      modal.classList.remove("show");

    });


  modal.addEventListener("click", (event) => {

    if (event.target === modal) {

      modal.classList.remove("show");

    }

  });


  /* =========================
     TABS
  ========================= */

  tabs.forEach(tab => {

    tab.addEventListener("click", () => {

      setMode(tab.dataset.mode);

    });

  });


  /* =========================
     SUBMIT
  ========================= */

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    message.textContent =
      "در حال ثبت...";

    submitButton.disabled = true;


    const phone =
      modal.querySelector("#phone").value.trim();

    const password =
      modal.querySelector("#password").value.trim();


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

        full_name:
          modal.querySelector("#full_name").value.trim(),

        phone: phone,

        email:
          modal.querySelector("#email").value.trim(),

        language:
          modal.querySelector("#language").value,

        goal:
          modal.querySelector("#goal").value.trim(),

        level:
          modal.querySelector("#level").value,

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


      const result =
        await response.json();


      if (!response.ok || !result.ok) {

        message.textContent =
          result.message ||
          "عملیات انجام نشد.";

        submitButton.disabled = false;

        return;

      }


      message.textContent =
        result.message ||
        "با موفقیت انجام شد.";


      if (result.redirect) {

        setTimeout(() => {

          window.location.href =
            result.redirect;

        }, 500);

      }

    } catch (error) {

      console.error(error);

      message.textContent =
        "ارتباط با سرور برقرار نشد.";

      submitButton.disabled = false;

    }

  });

});
