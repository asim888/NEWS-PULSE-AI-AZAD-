
/**
 * Safe Environment Variable Access
 * Checks Vite (import.meta.env), Process (Node), and Window scopes.
 */
export const getEnv = (key: string): string => {
    // 1. Try Vite (Best for Vercel React/Vite apps)
    // Note: We use string access to avoid build errors if types aren't set
    try {
        // @ts-ignore
        if (import.meta && import.meta.env && import.meta.env[`VITE_${key}`]) {
            // @ts-ignore
            return import.meta.env[`VITE_${key}`];
        }
    } catch (e) {}

    // 2. Try Standard Process (Node/Webpack)
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
            // @ts-ignore
            if (process.env[key]) return process.env[key];
        }
    } catch (e) {}

    // 3. Try Window Polyfill
    try {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.process && window.process.env) {
            // @ts-ignore
            if (window.process.env[`VITE_${key}`]) return window.process.env[`VITE_${key}`];
             // @ts-ignore
            if (window.process.env[key]) return window.process.env[key];
        }
    } catch (e) {}

    return '';
};
