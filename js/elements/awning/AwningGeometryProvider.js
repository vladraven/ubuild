import {
    createAwningGeometry
} from '../../model/geometry/AwningGeometry.js';

export const AwningGeometryProvider =
    Object.freeze({
        create(context) {
            if (!context?.model) {
                throw new TypeError(
                    'BuildingModel is required'
                );
            }

            if (!context?.geometry?.envelope) {
                throw new TypeError(
                    'BuildingEnvelope is required'
                );
            }

            return createAwningGeometry(
                context.model,
                context.geometry.envelope
            );
        }
    });