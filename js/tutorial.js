// V65 — Interactive weapons & power-ups tutorial
(() => {
    const pages = [
        {
            icon: '🎮',
            title: 'How the Tutorial Works',
            body: '<p>Welcome to the Weapons & Power-Ups tutorial. Walk through each item to learn what it does and how to use it.</p><p><b>P1:</b> WASD drives, SHIFT sprints, and SPACE fires the current item. In 1v1, <b>P2:</b> Arrow keys drive and Right Shift / ENTER fires.</p><div class="tutorial-tip">Tip: Collect weapon crates to receive a random weapon. Power-up crates give immediate effects.</div>'
        },
        {
            icon: '💣',
            title: 'Cannon Ball',
            body: '<p>Fires a heavy cannon ball straight ahead.</p><p>The cannon ball travels forward and can damage opponents on impact.</p><p><b>This weapon deals 100 damage.</b></p><div class="tutorial-tip"><b>Use it when:</b> an opponent is lined up in front of you.</div>'
        },
        {
            icon: '⭐',
            title: 'Invincible Star',
            body: '<p>Activating the star makes your vehicle invincible for 3 seconds.</p><p>While active, use the protection to take risks and pressure opponents.</p><p><b>This weapon instantly kills on hit.</b></p><div class="tutorial-tip"><b>Use it when:</b> you need to survive a dangerous collision or push aggressively.</div>'
        },
        {
            icon: '⚙️',
            title: 'Spiky Shields',
            body: '<p>Creates three spikes around your vehicle for a limited time.</p><p>The spikes can punish opponents that get too close.</p><p><b>This weapon lasts for 5 seconds and 1 shots.</b></p><div class="tutorial-tip"><b>Use it when:</b> enemies are trying to ram or crowd you.</div>'
        },
        {
            icon: '🔫',
            title: 'Auto Minigun',
            body: '<p>Fires a rapid burst of up to 10 shots, automatically targeting the closest opponent when possible.</p><p><b>This weapon deals 20 damage per shot.</b></p><div class="tutorial-tip"><b>Use it when:</b> you want sustained ranged pressure instead of one big hit.</div>'
        },
        {
            icon: '📦',
            title: 'Fake Crate Trap',
            body: '<p>Places a fake crate behind your vehicle. It acts as a trap for opponents.</p><p><b>This weapon explodes and 1 shots.</b></p><div class="tutorial-tip"><b>Use it when:</b> you expect an opponent to chase you closely.</div>'
        },
        {
            icon: '🪝',
            title: 'Grappling Hook',
            body: '<p>Fires grappling hooks forward. You begin with three hook shots when the weapon is granted.</p><p>Depending on your remaining shots, the weapon fires one, two, or three hooks.</p><p><b>This weapon deals 20 damage per hook.</b></p><div class="tutorial-tip"><b>Use it when:</b> you want to disrupt an opponent at close-to-medium range.</div>'
        },
        {
            icon: '🚀',
            title: 'Tactical Nuke',
            body: '<p>The nuke can be charged before firing. Holding the fire key increases its charge time and therefore its target range.</p><p>Release the fire key to launch it.</p><p><b>This weapon deals 75 damage.</b></p><div class="tutorial-tip"><b>Use it when:</b> you have time to charge and want a powerful long-range attack.</div>'
        },
        {
            icon: '🛡️',
            title: 'Shield Power-Up',
            body: '<p>Immediately activates a temporary shield.</p><p>The shield lasts 5 seconds.</b>.</p><div class="tutorial-tip"><b>Use it for:</b> surviving incoming pressure and buying time to reposition.</div>'
        },
        {
            icon: '❤️',
            title: 'Full Health Power-Up',
            body: '<p>Instantly restores your vehicle to <b>100 health</b>.</p><div class="tutorial-tip"><b>Use it for:</b> recovering after taking damage and staying in the fight.</div>'
        },
        {
            icon: '🔥',
            title: 'Overdrive Nitro Boost',
            body: '<p>Activates a temporary nitro boost and immediately refills your stamina.</p><p>This lasts for 5 seconds.</b>.</p><div class="tutorial-tip"><b>Use it for:</b> making a fast escape, chasing an opponent, or repositioning.</div>'
        },
        {
            icon: '🏁',
            title: 'Ready for Battle!',
            body: '<p>You now know every weapon and power-up currently defined in the game.</p><p>Remember: weapons are activated with your fire key, while power-ups activate automatically when collected.</p><div class="tutorial-tip"><b>Good luck in the arena!</b> Experiment with different items to find your favorite strategy.</div>'
        }
    ];

    let page = 0;
    const overlay = document.getElementById('tutorial-overlay');
    const title = document.getElementById('tutorial-title');
    const icon = document.getElementById('tutorial-icon');
    const body = document.getElementById('tutorial-body');
    const pageLabel = document.getElementById('tutorial-page');
    const prev = document.getElementById('tutorial-prev');
    const next = document.getElementById('tutorial-next');

    function render() {
        const p = pages[page];
        title.textContent = p.title;
        icon.textContent = p.icon;
        body.innerHTML = p.body;
        pageLabel.textContent = `${page + 1} / ${pages.length}`;
        prev.disabled = page === 0;
        next.textContent = page === pages.length - 1 ? 'FINISH ✓' : 'NEXT →';
    }

    function open() {
        page = 0;
        render();
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function close() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('tutorial-btn').addEventListener('click', open);
    document.getElementById('tutorial-close').addEventListener('click', close);

    prev.addEventListener('click', () => {
        if (page > 0) { page--; render(); }
    });

    next.addEventListener('click', () => {
        if (page < pages.length - 1) {
            page++;
            render();
        } else {
            close();
        }
    });

    overlay.addEventListener('click', e => {
        if (e.target === overlay) close();
    });

    window.addEventListener('keydown', e => {
        if (!overlay.classList.contains('active')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft' && page > 0) { page--; render(); }
        else if (e.key === 'ArrowRight') {
            if (page < pages.length - 1) { page++; render(); }
            else close();
        }
    });

    render();
})();
