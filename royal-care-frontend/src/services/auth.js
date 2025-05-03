// src/services/auth.js
import axios from "axios";

const API_URL = "http://localhost:8000/api/auth/";

export const login = (username, password) => {
  return axios.post(API_URL + "login/", { username, password });
};

export const register = (userData) => {
  return axios.post(API_URL + "register/", userData);
};
