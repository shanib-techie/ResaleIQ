// Pulls live profile stats and repos from the public GitHub API.
// Falls back quietly if the request fails (e.g. offline, rate-limited).
document.addEventListener('DOMContentLoaded', () => {
  const USER = 'shanib-techie';
  const LANG_COLORS = {
    Python: '#3572A5', JavaScript: '#f1e05a', HTML: '#e34c26', CSS: '#563d7c',
    'C++': '#f34b7d', C: '#555555', TypeScript: '#3178c6', Jupyter: '#DA5B0B'
  };

  fetch(`https://api.github.com/users/${USER}`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(user => {
      document.getElementById('stat-repos').textContent = user.public_repos ?? '—';
      document.getElementById('stat-followers').textContent = user.followers ?? '—';
      document.getElementById('stat-following').textContent = user.following ?? '—';
      if (user.name) document.getElementById('profile-name').textContent = user.name;
      if (user.avatar_url) document.getElementById('avatar').src = user.avatar_url;
    })
    .catch(() => { /* keep static fallback values already in the HTML */ });

  fetch(`https://api.github.com/users/${USER}/repos?sort=updated&per_page=6`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(repos => {
      const grid = document.getElementById('repo-grid');
      const status = document.getElementById('repo-status');
      if (!Array.isArray(repos) || repos.length === 0) {
        status.textContent = 'No public repositories found.';
        return;
      }
      status.remove();
      grid.innerHTML = repos.map(repo => `
        <a class="card repo-card" href="${repo.html_url}" target="_blank" rel="noopener">
          <span class="repo-name">${repo.name}</span>
          <span class="repo-desc">${repo.description ? repo.description : 'No description provided.'}</span>
          <span class="repo-meta">
            <span><span class="lang-dot" style="background:${LANG_COLORS[repo.language] || 'var(--brass)'}"></span>${repo.language || 'N/A'}</span>
            <span>★ ${repo.stargazers_count}</span>
          </span>
        </a>
      `).join('');
    })
    .catch(() => {
      const status = document.getElementById('repo-status');
      if (status) status.textContent = 'Could not reach GitHub right now — visit the profile directly instead.';
    });
});
