export const UserProfiler = {
    async fetchNetworkData() {
        try {
            // Использование стороннего сервиса для получения IP, провайдера и примерной локации (без CORS ограничений)
            const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
            return await response.json();
        } catch (error) {
            return { error: 'Network data fetch failed', details: error.message };
        }
    },

    getBrowserData() {
        // return {
            // userAgent: navigator.userAgent,
            // language: navigator.language,
            // languages: navigator.languages,
            // platform: navigator.platform,
            // vendor: navigator.vendor,
            // cookiesEnabled: navigator.cookieEnabled,
            // doNotTrack: navigator.doNotTrack,
            // hardwareConcurrency: navigator.hardwareConcurrency, // Количество логических ядер процессора
            // deviceMemory: navigator.deviceMemory || 'Not available', // Объем ОЗУ (доступно не везде)
            // maxTouchPoints: navigator.maxTouchPoints,
            // pdfViewerEnabled: navigator.pdfViewerEnabled
        // };
    },

    getScreenData() {
        // return {
            // width: window.screen.width,
            // height: window.screen.height,
            // availWidth: window.screen.availWidth,
            // availHeight: window.screen.availHeight,
            // colorDepth: window.screen.colorDepth,
            // pixelRatio: window.devicePixelRatio,
            // orientation: (window.screen.orientation || {}).type || 'unknown'
        // };
    },

    getSystemData() {
        // return {
            // timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            // timeZoneOffset: new Date().getTimezoneOffset() / -60, // Смещение в часах
            // connection: navigator.connection ? {
                // effectiveType: navigator.connection.effectiveType, // 3g, 4g и т.д.
                // downlink: navigator.connection.downlink, // Приблизительная скорость Мбит/с
                // rtt: navigator.connection.rtt, // Пинг
                // saveData: navigator.connection.saveData // Режим экономии трафика
            // } : 'Network Information API not supported'
        // };
    },

    getExactGeolocation() {
        // return new Promise((resolve) => {
            // if (!navigator.geolocation) {
                // resolve({ error: 'Geolocation API not supported by browser' });
                // return;
            // }
            
            // navigator.geolocation.getCurrentPosition(
                // (position) => {
                    // resolve({
                        // latitude: position.coords.latitude,
                        // longitude: position.coords.longitude,
                        // accuracy: position.coords.accuracy, // Точность в метрах
                        // altitude: position.coords.altitude,
                        // altitudeAccuracy: position.coords.altitudeAccuracy,
                        // heading: position.coords.heading, // Направление движения
                        // speed: position.coords.speed // Скорость
                    // });
                // },
                // (error) => {
                    // let errorMessage = 'Unknown error';
                    // switch(error.code) {
                        // case error.PERMISSION_DENIED: errorMessage = 'User denied the request for Geolocation'; break;
                        // case error.POSITION_UNAVAILABLE: errorMessage = 'Location information is unavailable'; break;
                        // case error.TIMEOUT: errorMessage = 'The request to get user location timed out'; break;
                    // }
                    // resolve({ error: errorMessage });
                // },
                // { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            // );
        // });
    },

    async generateReport() {
        // const report = {
            // timestamp: new Date().toISOString(),
            // browser: this.getBrowserData(),
            // screen: this.getScreenData(),
            // system: this.getSystemData(),
            // networkProfile: await this.fetchNetworkData(),
            // gps: 'Requesting permission...'
        // };

        // // Вывод данных в консоль по мере сборки (синхронные и сетевые данные)
        // console.log('--- USER PROFILE REPORT ---', report);

        // // Отдельный асинхронный вызов GPS, так как он требует действия пользователя
        // this.getExactGeolocation().then(gpsData => {
            // report.gps = gpsData;
            // console.log('--- EXACT GPS DATA RECEIVED ---', gpsData);
        // });

        // return report;
    }
};

// Пример использования (раскомментировать для запуска):
// UserProfiler.generateReport();