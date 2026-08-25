document.addEventListener('DOMContentLoaded', () => {
    if (typeof wpApiSettings === 'undefined') {
        console.error('WP API settings are missing. REST requests will fail.');
        return;
    }

    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.isLocked) return;
            this.isLocked = true;
            setTimeout(() => { this.isLocked = false; }, 150);

            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (!input || !icon) return;

            if (input.getAttribute('type') === 'password') {
                input.setAttribute('type', 'text');
                icon.className = 'bi bi-eye-slash';
            } else {
                input.setAttribute('type', 'password');
                icon.className = 'bi bi-eye';
            }
            
            input.focus();
        };
    });

    // ==========================================
    // ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ (ВНУТРИ LOGIN)
    // ==========================================
    const linkShowReset = document.getElementById('link-show-reset');
    const btnCancelReset = document.getElementById('btn-cancel-reset');
    const loginFormBlock = document.getElementById('login-form-block');
    const resetFormBlock = document.getElementById('reset-form-block');

    if (linkShowReset && loginFormBlock && resetFormBlock) {
        linkShowReset.addEventListener('click', (e) => {
            e.preventDefault();
            loginFormBlock.style.display = 'none';
            resetFormBlock.style.display = 'block';
            
            const errReset = document.getElementById('reset-error');
            const succReset = document.getElementById('reset-success');
            if (errReset) errReset.innerText = '';
            if (succReset) succReset.innerText = '';
            
            const inputResetEmail = document.getElementById('reset-email');
            if (inputResetEmail) inputResetEmail.focus();
        });
    }

    if (btnCancelReset && loginFormBlock && resetFormBlock) {
        btnCancelReset.addEventListener('click', (e) => {
            e.preventDefault();
            resetFormBlock.style.display = 'none';
            loginFormBlock.style.display = 'block';
            if (errLogin) errLogin.innerText = '';
            if (inputLoginEmail) inputLoginEmail.focus();
        });
    }

    // ==========================================
    // ЛОГИКА РЕГИСТРАЦИИ (Вкладка "Register")
    // ==========================================
    const btnVerify = document.getElementById('btn-verify-code');
    const btnRegister = document.getElementById('btn-register');
    const inputCode = document.getElementById('reg-code');
    const inputRegFirstName = document.getElementById('reg-firstname');
    const inputRegLastName = document.getElementById('reg-lastname');
    const inputRegEmail = document.getElementById('reg-email');
    const inputRegPhone = document.getElementById('reg-phone'); 
    const inputRegSecretWord = document.getElementById('reg-secret-word'); // Поле секретного вопроса
    const inputRegPassword = document.getElementById('reg-password');
    const inputRegPasswordConfirm = document.getElementById('reg-password-confirm');
    const errCode = document.getElementById('code-error');
    const errReg = document.getElementById('reg-error');
    let verifiedCode = '';

    const verifyCodeAction = async () => {
        const code = inputCode.value.trim();
        if (!code) return;
        
        btnVerify.disabled = true; 
        btnVerify.innerHTML = 'Verifying...'; 
        errCode.innerText = '';
        
        try {
            const res = await fetch(wpApiSettings.root + 'configurator/v1/verify-code', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ code: code })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Verification failed');
            
            verifiedCode = code;
            document.getElementById('auth-step-1').style.display = 'none';
            document.getElementById('auth-step-2').style.display = 'block';
            
            setTimeout(() => inputRegFirstName.focus(), 100);
            
        } catch (error) {
            errCode.innerText = error.message; 
            btnVerify.disabled = false; 
            btnVerify.innerHTML = 'Verify Code';
            inputCode.focus();
        }
    };

    const registerAction = async () => {
        const firstName = inputRegFirstName.value.trim();
        const lastName = inputRegLastName.value.trim();
        const email = inputRegEmail.value.trim(); 
        const phone = inputRegPhone ? inputRegPhone.value.trim() : ''; 
        const secretWord = inputRegSecretWord ? inputRegSecretWord.value.trim() : ''; // Сбор секретного ответа
        const password = inputRegPassword.value;
        const confirmPassword = inputRegPasswordConfirm.value;
        
        if (!firstName || !lastName || !email || !secretWord || !password || !confirmPassword) { 
            errReg.innerText = 'Please fill all fields, including the Secret Word.'; 
            return; 
        }

        if (password !== confirmPassword) {
            errReg.innerText = 'Passwords do not match.';
            inputRegPasswordConfirm.focus();
            return;
        }
        
        btnRegister.disabled = true; 
        btnRegister.innerHTML = 'Creating Account...'; 
        errReg.innerText = '';
        
        try {
            const res = await fetch(wpApiSettings.root + 'configurator/v1/register', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    code: verifiedCode, 
                    first_name: firstName,
                    last_name: lastName,
                    email: email, 
                    phone: phone,
                    secret_word: secretWord, // Передача секретного слова
                    password: password 
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            
            window.location.reload();
        } catch (error) {
            errReg.innerText = error.message; 
            btnRegister.disabled = false; 
            btnRegister.innerHTML = 'Create Account';
        }
    };

    if (btnVerify && btnRegister) {
        btnVerify.addEventListener('click', verifyCodeAction);
        btnRegister.addEventListener('click', registerAction);

        inputCode.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); verifyCodeAction(); }
        });

        inputRegFirstName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRegLastName.focus(); }
        });

        inputRegLastName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRegEmail.focus(); }
        });

        inputRegEmail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRegPhone.focus(); }
        });

        inputRegPhone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRegSecretWord.focus(); } // Переход на секретное слово
        });

        inputRegSecretWord.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRegPassword.focus(); } // Переход на пароль
        });

        inputRegPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputRegPasswordConfirm.focus(); }
        });

        inputRegPasswordConfirm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); registerAction(); }
        });
    }

    // ==========================================
    // ЛОГИКА ВХОДА (Вкладка "Log In")
    // ==========================================
    const btnLogin = document.getElementById('btn-login');
    const inputLoginEmail = document.getElementById('login-email');
    const inputLoginPassword = document.getElementById('login-password');
    const errLogin = document.getElementById('login-error');

    const loginAction = async () => {
        const email = inputLoginEmail.value.trim(); 
        const password = inputLoginPassword.value;
        
        if (!email || !password) { 
            errLogin.innerText = 'Please enter email and password.'; 
            return; 
        }
        
        btnLogin.disabled = true; 
        btnLogin.innerHTML = 'Logging in...'; 
        errLogin.innerText = '';
        
        try {
            const res = await fetch(wpApiSettings.root + 'configurator/v1/login', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email: email, password: password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Login failed');
            
            window.location.reload();
        } catch (error) {
            errLogin.innerText = error.message; 
            btnLogin.disabled = false; 
            btnLogin.innerHTML = 'Log In';
            inputLoginPassword.focus();
        }
    };

    if (btnLogin) {
        btnLogin.addEventListener('click', loginAction);

        inputLoginEmail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputLoginPassword.focus(); }
        });

        inputLoginPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); loginAction(); }
        });
    }

    // ==========================================
    // ЛОГИКА СБРОСА ПАРОЛЯ (Email + Code + Word)
    // ==========================================
    const btnSubmitReset = document.getElementById('btn-submit-reset');
    const inputResetEmail = document.getElementById('reset-email');
    const inputResetCode = document.getElementById('reset-invitation-code');
    const inputResetSecretWord = document.getElementById('reset-secret-word');
    const inputResetNewPassword = document.getElementById('reset-new-password');
    const errReset = document.getElementById('reset-error');
    const succReset = document.getElementById('reset-success');

    const resetPasswordAction = async () => {
        const email = inputResetEmail.value.trim();
        const code = inputResetCode.value.trim();
        const secretWord = inputResetSecretWord.value.trim();
        const newPassword = inputResetNewPassword.value;

        if (!email || !code || !secretWord || !newPassword) {
            errReset.innerText = 'All fields are required.';
            succReset.innerText = '';
            return;
        }

        btnSubmitReset.disabled = true;
        btnSubmitReset.innerHTML = 'Verifying...';
        errReset.innerText = '';
        succReset.innerText = '';

        try {
            const res = await fetch(wpApiSettings.root + 'configurator/v1/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    code: code,
                    secret_word: secretWord,
                    new_password: newPassword
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Password reset failed');

            succReset.innerText = 'Password updated successfully! Redirecting...';
            errReset.innerText = '';
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            errReset.innerText = error.message;
            succReset.innerText = '';
            btnSubmitReset.disabled = false;
            btnSubmitReset.innerHTML = 'Reset Password';
        }
    };

    if (btnSubmitReset) {
        btnSubmitReset.addEventListener('click', resetPasswordAction);

        inputResetEmail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputResetCode.focus(); }
        });

        inputResetCode.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputResetSecretWord.focus(); }
        });

        inputResetSecretWord.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputResetNewPassword.focus(); }
        });

        inputResetNewPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); resetPasswordAction(); }
        });
    }
});