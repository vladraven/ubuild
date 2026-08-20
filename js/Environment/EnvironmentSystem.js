// js/environment/EnvironmentSystem.js
import * as THREE from 'three';

export function createEnvironmentSystem() {
    let state = {
        date: new Date(),
        hemisphere: 'north',
        weather: 'clear'
    };

    function getSeason(date) {
        const month = date.getMonth(); // 0-11
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    }

    return Object.freeze({
        update(input) {
            state = { ...state, ...input };
            const season = getSeason(state.date);
            // Здесь будет логика обновления визуальных ресурсов окружения
            console.log(`Environment updated: ${season}, ${state.weather}`);
        },
        getState: () => ({ ...state, season: getSeason(state.date) })
    });
}