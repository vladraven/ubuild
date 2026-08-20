// js/lighting/SolarPosition.js
export function getSolarState(input) {
    // В реальности здесь алгоритм расчета положения солнца по координатам
    // В демо-режиме возвращаем моковые значения
    const hour = parseInt(input.time.split(':')[0]);
    
    return {
        azimuth: hour * 15, // Упрощенно
        elevation: Math.sin((hour - 6) * Math.PI / 12) * 90,
        phase: hour > 6 && hour < 18 ? 'day' : 'night'
    };
}