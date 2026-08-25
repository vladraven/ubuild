// api.js
export const AnalyticsTracker = {
    sessionStart: Date.now(),
    sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
    geoData: null,

    async init() {
        try {
            // ИСПРАВЛЕНИЕ CORS: используем geojs.io
            const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
            if (res.ok) {
                this.geoData = await res.json();
            }
        } catch(e) {
            this.geoData = { error: 'Geo blocked or failed' };
        }

        this.track('app_open');

        window.addEventListener('beforeunload', () => {
            const durationSeconds = Math.floor((Date.now() - this.sessionStart) / 1000);
            this.track('time_spent', { duration_seconds: durationSeconds }, true);
        });
    },

    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes("Firefox/")) return "Firefox";
        if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
        if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
        if (ua.includes("Edg/")) return "Edge";
        return "Unknown";
    },

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return "Tablet";
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return "Mobile";
        }
        return "Desktop";
    },

    getScreenResolution() {
        return `${window.screen.width}x${window.screen.height}`;
    },

    track(eventName, properties = {}, isUnload = false) {
        if (typeof wpApiSettings === 'undefined') return;

        const payload = {
            event: eventName,
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            browser: this.getBrowserInfo(),
            device_type: this.getDeviceType(),
            screen_resolution: this.getScreenResolution(),
            geo: this.geoData,
            properties: properties
        };

        const url = wpApiSettings.root + 'configurator/v1/log-event';

        if (isUnload && navigator.sendBeacon) {
            navigator.sendBeacon(url, JSON.stringify(payload));
        } else {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': wpApiSettings.nonce
                },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(e => console.error('Analytics error:', e));
        }
    }
};