// common.js

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = '/index.html';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`/api${endpoint}`, config);
    if (res.status === 401) {
        logout();
        return new Promise(() => {}); // hang forever while redirecting
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API Error');
    return data;
}

// Global Socket and Notifications
let socket;

async function initCommon() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') return;
    
    requireAuth();
    
    const user = getUser();
    if (document.getElementById('user-name')) document.getElementById('user-name').innerText = user.username;
    if (document.getElementById('user-avatar')) document.getElementById('user-avatar').src = user.avatarUrl;

    // Socket
    socket = io({ auth: { token: getToken() } });
    
    socket.on('notification', (notif) => {
        showToast(notif.message);
        loadNotifications();
    });

    // Notifications UI
    document.getElementById('notif-btn')?.addEventListener('click', async () => {
        const list = document.getElementById('notif-list');
        list.classList.toggle('show');
        if (list.classList.contains('show')) {
            await apiCall('/notifications/read', 'POST');
            document.getElementById('notif-badge').style.display = 'none';
            document.getElementById('notif-badge').innerText = '0';
        }
    });

    loadNotifications();
}

async function loadNotifications() {
    if (!document.getElementById('notif-list')) return;
    try {
        const notifs = await apiCall('/notifications');
        const list = document.getElementById('notif-list');
        list.innerHTML = '';
        let unreadCount = 0;
        
        notifs.forEach(n => {
            if (!n.read) unreadCount++;
            list.innerHTML += `<div class="notif-item ${n.read ? '' : 'unread'}">${n.message} <span class="notif-time">${new Date(n.createdAt).toLocaleString()}</span></div>`;
        });

        if (notifs.length === 0) {
            list.innerHTML = '<div class="notif-item">No notifications</div>';
        }

        const badge = document.getElementById('notif-badge');
        if (unreadCount > 0) {
            badge.innerText = unreadCount;
            badge.style.display = 'block';
        }
    } catch (e) {
        console.error(e);
    }
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = '#333';
    toast.style.color = 'white';
    toast.style.padding = '15px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '1000';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', initCommon);
