import { envVar, setEnvVarsFromServer } from "../utils/env";
import { getCookie, AUTH_COOKIE_NAME } from '../utils/cookies'
import axios from "axios";

class DB_SERVER {
    constructor() {
        this.serverUrl = envVar('SERVER_URL') || window.location.href;

        this.axios = axios.create({
            validateStatus: () => true // Always resolve, never reject for HTTP codes
        });
    }

    async createFetch(urlParams, method, body = null, addToken = false, headers = null, stringifyBody = true, onUploadProgressCB = null) {
        const apiUrl = (urlParams.startsWith("http")) ? urlParams : `${this.serverUrl}${urlParams}`;

        headers = headers || { "Content-Type": "application/json" };

        if (addToken) {
            const accessToken = getCookie(AUTH_COOKIE_NAME);
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        let requestParams = {
            url: apiUrl,
            method,
            headers,
            onUploadProgress: onUploadProgressCB || undefined
        }

        if (Object.keys(headers).length > 0)
            requestParams['headers'] = headers;

        if (body)
            requestParams['data'] = stringifyBody ? JSON.stringify(body) : body;

        let result = null;
        try {
            result = await this.axios(requestParams);

            if (result.data === "" || result.data === null) {
                return { success: result.status >= 200 && result.status < 300 };
            }

            return result.data;
        }
        catch (e) {
            return { success: false, message: e?.message || "Request failed" };
        }
    }

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

    async deleteUser(user) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await this.createFetch('/user/delete', 'post', { user: user }, true);

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

    async uploadMovie(file, onUploadProgressCB, subFolder = null) {
        try {
            const presignData = {
                fileName: file.name,
                fileType: file.type,
                subFolder
            };

            let response = await this.createFetch('/files/presign', 'post', presignData, false, {}, false);
            const { url, presign, bucketUrl } = response

            if (response.success) {
                if (presign)
                    response = await this.createFetch(url, 'put', file, false, { "Content-Type": file.type }, false, onUploadProgressCB);
                else {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("subFolder", subFolder);

                    const response = await this.createFetch(url, 'put', formData, true, {}, false, onUploadProgressCB);
                }

                return ({
                    success: true,
                    message: 'The file was uploaded successfully.',
                    url: bucketUrl ? bucketUrl : url,
                    file_name: file.name,
                    subFolder: subFolder,
                    times: 1,
                    deletable: true
                });
            }
            else
                return ({ success: false, message: response.message });
        }
        catch (e) {
            return ({ success: false, message: e.message })
        }
    }
}

export const db = new DB_SERVER();
