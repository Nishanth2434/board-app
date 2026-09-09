const urlParams = new URLSearchParams(window.location.search);
const boardId = urlParams.get('id');

if (!boardId) window.location.href = '/dashboard.html';

let board = null;
let cards = [];
let currentCard = null;

async function loadBoard() {
    try {
        board = await apiCall(`/boards/${boardId}`);
        document.getElementById('board-title').innerText = board.name;
        document.getElementById('board-canvas').style.backgroundColor = board.backgroundColor || '#0079BF';
        
        const membersHtml = board.members.map(m => `<img src="${m.avatarUrl}" title="${m.username}" class="avatar">`).join('');
        document.getElementById('project-members').innerHTML = membersHtml;

        cards = await apiCall(`/cards/board/${boardId}`);
        renderBoard();

        // Socket logic
        socket.emit('join_board', boardId);
        
        socket.on('card_created', (card) => {
            cards.push(card);
            renderBoard();
        });
        
        socket.on('card_updated', (updatedCard) => {
            const idx = cards.findIndex(c => c._id === updatedCard._id);
            if (idx > -1) cards[idx] = updatedCard;
            renderBoard();
            if (currentCard && currentCard._id === updatedCard._id) openCardModal(updatedCard._id); // refresh
        });

        socket.on('card_deleted', ({id}) => {
            cards = cards.filter(c => c._id !== id);
            renderBoard();
            if (currentCard && currentCard._id === id) closeModal('task-modal');
        });

        socket.on('comment_added', (comment) => {
            if (currentCard && currentCard._id === comment.cardId) {
                loadComments(currentCard._id);
            }
        });

        socket.on('board_updated', (updatedBoard) => {
            board = updatedBoard;
            renderBoard();
        });

    } catch (e) {
        alert('Failed to load board: ' + e.message);
        window.location.href = '/dashboard.html';
    }
}

function renderBoard() {
    const container = document.getElementById('board-columns');
    container.innerHTML = '';

    board.lists.sort((a, b) => a.order - b.order).forEach(list => {
        const listDiv = document.createElement('div');
        listDiv.className = 'list-wrapper';
        listDiv.dataset.id = list._id;
        
        const listCards = cards.filter(c => c.listId === list._id).sort((a, b) => a.order - b.order);
        const cardsHtml = listCards.map(c => createCardHtml(c)).join('');

        listDiv.innerHTML = `
            <div class="list-content">
                <div class="list-header">
                    <h2 class="list-header-name">${list.name}</h2>
                    <button class="list-header-extras" onclick="deleteList('${list._id}')">⋯</button>
                </div>
                <div class="list-cards" data-list="${list._id}" ondragover="allowDrop(event)" ondrop="drop(event)">
                    ${cardsHtml}
                </div>
                <div class="list-footer">
                    <button class="add-card-btn" onclick="quickAddCard('${list._id}')">
                        <span style="font-size: 1.2rem; margin-right: 4px; line-height: 1;">+</span> Add a card
                    </button>
                </div>
            </div>
        `;
        container.appendChild(listDiv);
    });
}

const labelColors = {
    'green': '#7BC86C',
    'yellow': '#F5DD29',
    'orange': '#FFAF3F',
    'red': '#EF7564',
    'purple': '#CD8CEB',
    'blue': '#5BA4CF'
};

function createCardHtml(c) {
    const assignees = c.assignees && c.assignees.length > 0 
        ? `<div class="card-members">${c.assignees.map(a => `<img src="${a.avatarUrl}" class="card-avatar" title="${a.username}">`).join('')}</div>` 
        : '';
    
    let labelsHtml = '';
    if (c.labels && c.labels.length > 0) {
        labelsHtml = `<div class="card-labels">${c.labels.map(l => `<span class="card-label" style="background-color: ${labelColors[l] || '#b3bac5'}"></span>`).join('')}</div>`;
    }

    let badgesHtml = '';
    if (c.description) badgesHtml += `<span class="card-badge" title="This card has a description">≡</span>`;
    if (c.dueDate) badgesHtml += `<span class="card-badge ${new Date(c.dueDate) < new Date() ? 'is-due-past' : ''}">⏰ ${new Date(c.dueDate).toLocaleDateString()}</span>`;

    const badgesContainer = badgesHtml ? `<div class="card-badges">${badgesHtml}</div>` : '';
    
    return `
        <div class="list-card" draggable="true" ondragstart="drag(event, '${c._id}')" onclick="openCardModal('${c._id}')" data-id="${c._id}">
            ${labelsHtml}
            <div class="list-card-title">${c.title}</div>
            <div class="list-card-details">
                ${badgesContainer}
                ${assignees}
            </div>
        </div>
    `;
}

async function quickAddCard(listId) {
    const title = prompt('Enter card title:');
    if (!title) return;
    try {
        await apiCall('/cards', 'POST', { boardId, listId, title, order: 0 });
    } catch (e) {
        alert(e.message);
    }
}

async function addColumn() {
    const name = prompt('List title:');
    if (!name) return;
    try {
        const b = await apiCall(`/boards/${boardId}/lists`, 'POST', { name });
        board = b;
        renderBoard();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteList(listId) {
    if (!confirm('Delete this list?')) return;
    try {
        const b = await apiCall(`/boards/${boardId}/lists/${listId}`, 'DELETE');
        board = b;
        renderBoard();
    } catch (e) {
        alert(e.message);
    }
}

// Drag and drop
let draggedCardId = null;
function drag(ev, id) {
    draggedCardId = id;
    ev.dataTransfer.setData("text", id);
    setTimeout(() => ev.target.classList.add('dragging'), 0);
}

function allowDrop(ev) {
    ev.preventDefault();
}

async function drop(ev) {
    ev.preventDefault();
    const cardId = draggedCardId;
    const cardEl = document.querySelector(`.list-card[data-id="${cardId}"]`);
    if(cardEl) cardEl.classList.remove('dragging');
    
    let targetContainer = ev.target.closest('.list-cards');
    if (!targetContainer) return;

    const newListId = targetContainer.dataset.list;
    if (!newListId) return;

    const card = cards.find(c => c._id === cardId);
    if (card.listId === newListId) return;

    // Optimistic UI
    card.listId = newListId;
    renderBoard();

    try {
        await apiCall(`/cards/${cardId}`, 'PUT', { listId: newListId });
    } catch (e) {
        alert('Failed to move card');
        loadBoard();
    }
}

// Card Detail Modal
async function openCardModal(cardId) {
    currentCard = cards.find(c => c._id === cardId);
    if (!currentCard) return;

    document.getElementById('task-detail-title').value = currentCard.title;
    const listName = board.lists.find(l => l._id === currentCard.listId)?.name || '';
    document.getElementById('task-detail-list-name').innerText = listName;
    document.getElementById('task-detail-desc').value = currentCard.description || '';
    
    renderModalLabels();
    
    openModal('task-modal');
    loadComments(cardId);
}

function renderModalLabels() {
    const container = document.getElementById('task-detail-labels-container');
    if (!currentCard.labels || currentCard.labels.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = currentCard.labels.map(l => 
        `<span class="modal-label" style="background-color: ${labelColors[l]}"></span>`
    ).join('');
}

async function saveTaskDetail() {
    if (!currentCard) return;
    const title = document.getElementById('task-detail-title').value;
    const desc = document.getElementById('task-detail-desc').value;

    if (title === currentCard.title && desc === currentCard.description) {
        return;
    }

    try {
        await apiCall(`/cards/${currentCard._id}`, 'PUT', { title, description: desc });
    } catch (e) {
        alert('Failed to save card: ' + e.message);
    }
}

async function deleteTask() {
    if (!currentCard || !confirm('Delete this card?')) return;
    try {
        await apiCall(`/cards/${currentCard._id}`, 'DELETE');
        closeModal('task-modal');
    } catch (e) {
        alert('Failed to delete card: ' + e.message);
    }
}

function promptAddLabel() {
    const label = prompt('Enter a color (green, yellow, orange, red, purple, blue):');
    if (!label || !labelColors[label.toLowerCase()]) return;
    
    const newLabels = [...(currentCard.labels || []), label.toLowerCase()];
    apiCall(`/cards/${currentCard._id}`, 'PUT', { labels: newLabels }).catch(e => alert(e.message));
}

function promptAssignee() {
    const memberStr = board.members.map(m => `${m.username}`).join(', ');
    const assigneeStr = prompt(`Enter exact username to toggle assignment. Available: ${memberStr}`);
    if (!assigneeStr) return;
    
    const member = board.members.find(m => m.username === assigneeStr);
    if (!member) {
        alert('Member not found');
        return;
    }
    
    let newAssignees = (currentCard.assignees || []).map(a => a._id);
    if (newAssignees.includes(member._id)) {
        newAssignees = newAssignees.filter(id => id !== member._id); // remove
    } else {
        newAssignees.push(member._id); // add
    }
    
    apiCall(`/cards/${currentCard._id}`, 'PUT', { assignees: newAssignees }).catch(e => alert(e.message));
}

function promptDueDate() {
    const date = prompt('Enter due date (YYYY-MM-DD):');
    if (!date) return;
    apiCall(`/cards/${currentCard._id}`, 'PUT', { dueDate: date }).catch(e => alert(e.message));
}

// Comments
async function loadComments(cardId) {
    try {
        const comments = await apiCall(`/comments/card/${cardId}`);
        const list = document.getElementById('comments-list');
        const currentUser = getUser();
        
        list.innerHTML = comments.map(c => `
            <div class="activity-item">
                <img src="${c.userId.avatarUrl}" class="avatar">
                <div class="activity-content">
                    <span class="activity-user">${c.userId.username}</span>
                    <span class="activity-time">${new Date(c.createdAt).toLocaleString()}</span>
                    <div class="activity-text">${c.text}</div>
                    ${c.userId._id === currentUser.id ? `<button onclick="deleteComment('${c._id}')" class="activity-action">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

async function deleteComment(commentId) {
    if (!confirm('Delete comment?')) return;
    try {
        await apiCall(`/comments/${commentId}`, 'DELETE');
        if (currentCard) loadComments(currentCard._id);
    } catch (e) {
        alert(e.message);
    }
}

document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('comment-text').value;
    if (!currentCard || !text.trim()) return;

    try {
        await apiCall('/comments', 'POST', { cardId: currentCard._id, text });
        document.getElementById('comment-text').value = '';
    } catch (e) {
        alert(e.message);
    }
});

// Add member
document.getElementById('add-member-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('member-email-username').value;
    try {
        const b = await apiCall(`/boards/${boardId}/members`, 'POST', { emailOrUsername: input });
        board = b;
        const membersHtml = board.members.map(m => `<img src="${m.avatarUrl}" title="${m.username}" class="avatar">`).join('');
        document.getElementById('project-members').innerHTML = membersHtml;
        closeModal('add-member-modal');
        document.getElementById('member-email-username').value = '';
    } catch (e) {
        alert(e.message);
    }
});

document.addEventListener('DOMContentLoaded', loadBoard);
