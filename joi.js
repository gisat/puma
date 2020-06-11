const Joi = require('@hapi/joi');

module.exports = Joi.extend((joi) => ({
    type: 'stringArray',
    base: Joi.array().meta({baseType: 'array'}),
    coerce: (value) => {
        if (value != null && value.split) {
            return {value: value.split(',')};
        }
    },
}));
