// Frontend — src/api/db.jsx (or similar)
//
// Client API Wrapper (DB_SERVER Class)
// This file defines the DB_SERVER class, which serves as the central client-side interface for all backend API interactions.
// It uses axios for HTTP requests and provides methods for authentication, settings, users, files, and more.
// All methods return Promises and normalize responses: successful backend responses are passed through, errors are wrapped as { success: false, message: ... }.
// 
// Key Features:
// - Axios configuration: validateStatus always true (handle all HTTP codes manually), dynamic headers including auth tokens.
// - Token support: Adds Bearer token from cookies if addToken=true.
// - Flexible fetching: createFetch handles body stringification, progress callbacks, custom headers.
// - Promise wrappers: Most methods use new Promise() for consistent resolve/reject, though async/await could simplify.
// - Environment integration: Loads server env vars via getEnvVariables and sets them globally.
// - Default settings: Fallback data structure if server fails.
// - S3 Upload Flow: uploadMovie uses presign → direct PUT → finalize for efficient, progress-tracked uploads.
// 
// Dependencies:
// - envVar, setEnvVarsFromServer: From utils/env for environment variable handling.
// - getCookie, AUTH_COOKIE_NAME: From utils/cookies for authentication token retrieval.
// - axios: HTTP client.
// 
// Usage: Import { db } and call methods like await db.login(email, password).
// 
// Potential Improvements:
// - Refactor Promise wrappers to use async/await directly for cleaner code (remove new Promise if not needed for legacy).
// - Add request timeouts and interceptors for global error handling or logging.
// - Consistent error propagation: Currently mixes resolve(reject) on errors; standardize to always reject on exceptions.
// - TypeScript integration: Add types for parameters and returns for better maintainability.

import { envVar, setEnvVarsFromServer } from "../utils/env"; // Utilities for reading and setting environment variables (client-side injection from server).
import { getCookie, AUTH_COOKIE_NAME } from '../utils/cookies' // Cookie helpers: getCookie retrieves values, AUTH_COOKIE_NAME is the key for auth token.
import axios from "axios"; // HTTP client for all API requests.

// DB_SERVER class: Encapsulates API endpoints, axios instance, and shared logic like token injection.
class DB_SERVER {
    // Constructor: Initializes server URL and axios instance.
    // serverUrl: From env or fallback to current page URL.
    // Axios: Configured to never reject on HTTP status (handle manually via response checks).
    constructor() {
        this.serverUrl = envVar('SERVER_URL') || window.location.href;

        this.axios = axios.create({
            validateStatus: () => true // Always resolve promises, allowing manual status inspection in code.
        });
    }

    /**
     * createFetch: Core method for making API requests.
     * Parameters:
     * - urlParams: Endpoint path (e.g., '/auth/login').
     * - method: HTTP method ('get', 'post', etc.).
     * - body: Data to send (null for GET).
     * - addToken: If true, injects Bearer token from cookies.
     * - headers: Custom headers (defaults to JSON content-type).
     * - stringifyBody: If false, sends body raw (e.g., for files or FormData).
     * - onUploadProgressCB: Callback for upload progress events.
     * 
     * Logic:
     * - Builds full URL.
     * - Adds auth header if requested.
     * - Configures request with method, headers, data (stringified if needed), progress.
     * - Executes axios and returns response.data directly.
     * - Catches exceptions and returns { success: false }.
     * 
     * Purpose: Centralizes request setup, auth, and basic error handling.
     */
    async createFetch(urlParams, method, body = null, addToken = false, headers = null, stringifyBody = true, onUploadProgressCB = null) {
        const apiUrl = `${this.serverUrl}${urlParams}`;

        if (!headers) {
            headers = { // default
                'Content-Type': 'application/json',
            };
        }

        if (addToken) {
            const accessToken = getCookie(AUTH_COOKIE_NAME);
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        let requestParams = {
            url: apiUrl,
            method: method,
        }

        if (Object.keys(headers).length > 0)
            requestParams['headers'] = headers;

        if (body) {
            if (stringifyBody)
                requestParams['data'] = JSON.stringify(body);
            else
                requestParams['data'] = body;
        }

        if (onUploadProgressCB) {
            requestParams['onUploadProgress'] = onUploadProgressCB;
        }

        let result = null;
        try {
            result = await this.axios(requestParams);

            return result.data;
        }
        catch (e) {
            return { success: false };
        }
    }

    // defaultSettings: Provides fallback settings object if server fetch fails.
    // Used in getSettings for partial recovery (e.g., merges with partial server data).
    // Structure: Theme, title, footer messages, empty movies/categories arrays.
    defaultSettings() {
        return {
            'colors_theme': 'light',
            'title': 'מיידעון - מערכת מידע אישית',
            'footer_messages': [
                { id: 0, msg: 'לא הוגדרו עדיין הודעות', active: 1 },
            ],
            'movies': [],
            'online_movies_categories': [],
        }
    }

    // available: Checks backend health.
    // Calls /db/available, resolves with response or normalized error.
    // Promise wrapper for consistency with other methods.
    async available() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/db/available', 'get');

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // getEnvVariables: Fetches public config from /config.
    // On success, sets vars via setEnvVarsFromServer and resolves.
    // Used for dynamic client config (e.g., features, APIs).
    async getEnvVariables() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/config', 'get');

                if (response.success) {
                    setEnvVarsFromServer(response.data);

                    resolve({ success: true });
                }
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // verify: Checks auth token validity via /auth/verify (with token).
    // Resolves with server response directly.
    async verify() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/auth/verify', 'get', null, true);

                resolve(response);
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // login: Authenticates with email/password.
    // POST to /auth/login, resolves with success or error message.
    async login(email, password) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/auth/login', 'post', { email: email, password: password });

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // getSettings: Retrieves user or global settings.
    // If user provided, POST to /settings/user; else GET /settings/get (with token).
    // On failure, falls back to defaultSettings and merges available data (e.g., movies).
    async getSettings(user = null) {
        return new Promise(async (resolve, reject) => {
            try {
                let response = null;
                if (!user)
                    response = await this.createFetch('/settings/get', 'get', null, true);
                else
                    response = await this.createFetch('/settings/user', 'post', user, true);

                if (response.success)
                    resolve({ success: true, data: response.data });
                else {
                    let settings = this.defaultSettings();
                    settings.movies = response.movies;
                    resolve({ success: true, data: settings });
                }
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // saveSettings: Saves settings via POST to /settings/set (with token).
    // Resolves with saved data or error (note: typo in response.messsage).
    async saveSettings(settings) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/settings/set', 'post', settings, true);

                if (response.success)
                    resolve({ success: true, data: settings });
                else
                    resolve({ success: false, message: response.messsage });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // getAllUsers: Admin fetch of all users via /user/all (with token).
    async getAllUsers() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/user/all', 'get', null, true);

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // getProtectedUsers: Tests protected endpoint /user/protected.
    // No token specified, but may rely on cookies.
    async getProtectedUsers() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/user/protected', 'get');

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // addUser: Creates new user via /user/add (with token).
    async addUser(userData) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/user/add', 'post', userData, true);

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // deleteUser: Removes user by email via /user/delete (with token).
    async deleteUser(email) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/user/delete', 'post', { email }, true);

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    // deleteMovie: Deletes file via /files/delete (with token).
    async deleteMovie(fileName, subFolder) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/files/delete', 'post', { fileName, subFolder }, true);

                if (response.success)
                    resolve(response);
                else
                    resolve({ success: false, message: response.message });
            }
            catch (e) {
                reject({ success: false, message: e.message })
            }
        })
    }

    /**
     * uploadMovie: Handles direct S3 uploads with presign flow.
     * Parameters: file (File object), onUploadProgressCB (for UI), subFolder (optional prefix).
     * 
     * Logic:
     * - Normalizes subFolder to null if undefined.
     * - Prepares fallback headers (x- prefixes) for server parsing compatibility.
     * - postJSON helper: Tries paths with fallbacks on 404/405.
     * - Step 1: Presign via POST to get signed URL, key, etc.
     * - Step 2: PUT file directly to S3 with progress.
     * - Step 3: Finalize via POST to verify.
     * 
     * Returns: Compatible shape { success, url, file_name, subFolder }.
     * Errors: Propagates from steps.
     */
    async uploadMovie(file, onUploadProgressCB, subFolder=null) {
        // Robust S3 pre-signed upload (tries /api/* first, then /files/*; sends header fallbacks)
        const subFolderSafe = (subFolder === undefined || subFolder === null) ? null : subFolder;

        // fallback headers so server sees values even if some client lib posts multipart/form-data
        const fallbackHeaders = {
        'x-file-name': encodeURIComponent(file.name),
        'x-content-type': file.type || 'application/octet-stream',
        };
        if (subFolderSafe) fallbackHeaders['x-sub-folder'] = subFolderSafe;

        // small helper to try a list of paths until one works
        const postJSON = async (paths, body) => {
        let lastErr;
        for (const p of paths) {
            try {
            const res = await this.axios.post(
                p,
                body,
                { headers: Object.assign({ 'Content-Type': 'application/json' }, fallbackHeaders) }
            );
            return res.data;
            } catch (e) {
            lastErr = e;
            if (e?.response?.status !== 404 && e?.response?.status !== 405) throw e;
            // else try next path
            }
        }
        throw lastErr || new Error('No working endpoint path');
        };

        // 1) presign
        const presignResp = await postJSON(
        ['/api/files/presign', '/files/presign'],
        {
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            subFolder: subFolderSafe,
        }
        );
        if (!presignResp || !presignResp.success) {
        return presignResp || { success: false, message: 'Presign failed' };
        }

        // 2) direct PUT to S3 (progress supported)
        const { url, headers, objectKey, publicUrl } = presignResp;
        const putResp = await this.axios.put(url, file, {
        headers: Object.assign({ 'Content-Type': file.type || 'application/octet-stream' }, headers || {}),
        onUploadProgress: (onUploadProgressCB ? onUploadProgressCB : undefined),
        maxBodyLength: Infinity,
        });
        if (!(putResp.status === 200 || putResp.status === 201 || putResp.status === 204)) {
        return { success: false, message: 'S3 upload failed', status: putResp.status };
        }

        // 3) finalize (server verifies object; returns normalized shape)
        const finalizeResp = await postJSON(
        ['/api/files/finalize', '/files/finalize'],
        { objectKey, fileName: file.name, subFolder: subFolderSafe }
        );
        if (!finalizeResp || !finalizeResp.success) {
        return finalizeResp || { success: false, message: 'Finalize failed' };
        }

        return {
        success: true,
        url: publicUrl || finalizeResp.url,
        file_name: file.name,
        subFolder: subFolderSafe
        };
    }
}

// Export singleton instance for app-wide use.
export const db = new DB_SERVER();