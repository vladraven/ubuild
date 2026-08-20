import {
    AwningGeometryProvider
} from './AwningGeometryProvider.js';

import {
    AwningVisualProvider
} from './AwningVisualProvider.js';

import {
    createElementOrchestrator
} from '../ElementOrchestrator.js';

export const AwningElement =
    createElementOrchestrator({
        definition: {
            id: 'awnings'
        },

        geometry:
            AwningGeometryProvider,

        visual:
            AwningVisualProvider
    });