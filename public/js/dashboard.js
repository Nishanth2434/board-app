async function loadBoards() {
    try {
        const boards = await apiCall('/boards');
        const grid = document.getElementById('projects-grid');
        grid.innerHTML = '';
        
        boards.forEach(b => {
            const card = document.createElement('div');
            card.className = 'board-card';
            card.style.backgroundColor = b.backgroundColor || '#0079BF';
            card.onclick = () => window.location.href = `/board.html?id=${b._id}`;
            card.innerHTML = `
                <div class="board-card-fade"></div>
                <h3 class="board-card-title">${b.name}</h3>
            `;
            grid.appendChild(card);
        });

        if (boards.length === 0) {
            grid.innerHTML = '<p style="color: #5e6c84; grid-column: 1 / -1;">No boards yet. Create your first board!</p>';
        }
    } catch (e) {
        alert(e.message);
    }
}

document.getElementById('create-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('project-name').value;
    const color = document.getElementById('board-color').value;

    try {
        await apiCall('/boards', 'POST', { name, backgroundColor: color });
        closeModal('create-board-modal');
        e.target.reset();
        loadBoards();
    } catch (e) {
        alert(e.message);
    }
});

document.addEventListener('DOMContentLoaded', loadBoards);
