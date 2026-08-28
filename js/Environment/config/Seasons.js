export const SEASONS_NORTH = Object.freeze({
    11: 'winter',
    0: 'winter',
    1: 'winter',
    2: 'spring',
    3: 'spring',
    4: 'spring',
    5: 'summer',
    6: 'summer',
    7: 'summer',
    8: 'autumn',
    9: 'autumn',
    10: 'autumn'
});

export const SEASONS_SOUTH = Object.freeze({
    11: 'summer',
    0: 'summer',
    1: 'summer',
    2: 'autumn',
    3: 'autumn',
    4: 'autumn',
    5: 'winter',
    6: 'winter',
    7: 'winter',
    8: 'spring',
    9: 'spring',
    10: 'spring'
});

export function getSeason(dateInput, hemisphere = 'north') {
    let month = 5;

    if (typeof dateInput === 'string') {
        const parts = dateInput.split('-');

        if (parts.length >= 2) {
            month = (parseInt(parts[1], 10) - 1) % 12;
        }
    } else if (dateInput instanceof Date) {
        month = dateInput.getMonth();
    }

    return hemisphere === 'south'
        ? SEASONS_SOUTH[month]
        : SEASONS_NORTH[month];
}