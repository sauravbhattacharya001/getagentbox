/**
 * @jest-environment jsdom
 */

// Tests for RoleDemoPicker component

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '';
  if (typeof window !== 'undefined') {
    delete window.RoleDemoPicker;
  }
});

function buildSection() {
  const roles = [
    { id: 'marketing', icon: '📣', label: 'Marketing' },
    { id: 'engineering', icon: '⚙️', label: 'Engineering' },
    { id: 'sales', icon: '💼', label: 'Sales' },
    { id: 'support', icon: '🎧', label: 'Support' },
    { id: 'executive', icon: '📈', label: 'Executive' },
    { id: 'hr', icon: '👥', label: 'HR & People' }
  ];

  const section = document.createElement('div');
  section.id = 'rolePickerSection';

  const grid = document.createElement('div');
  grid.className = 'role-picker-grid';

  roles.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'role-picker-btn';
    btn.setAttribute('data-role', r.id);
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `<span class="role-picker-icon">${r.icon}</span><span class="role-picker-label">${r.label}</span>`;
    grid.appendChild(btn);
  });

  const chatWrap = document.createElement('div');
  chatWrap.className = 'role-picker-chat';
  const messages = document.createElement('div');
  messages.className = 'role-chat-messages';
  messages.setAttribute('role', 'list');
  chatWrap.appendChild(messages);

  section.appendChild(grid);
  section.appendChild(chatWrap);
  document.body.appendChild(section);
}

function loadModule() {
  return require('../src/role-demo-picker.js');
}

describe('RoleDemoPicker', () => {
  test('exposes on window', () => {
    buildSection();
    loadModule();
    expect(window.RoleDemoPicker).toBeDefined();
    expect(typeof window.RoleDemoPicker.init).toBe('function');
    expect(typeof window.RoleDemoPicker.selectRole).toBe('function');
    expect(typeof window.RoleDemoPicker.getActiveRole).toBe('function');
    expect(typeof window.RoleDemoPicker.getRoles).toBe('function');
  });

  test('has 6 roles defined', () => {
    buildSection();
    loadModule();
    const roles = window.RoleDemoPicker.getRoles();
    expect(roles.length).toBe(6);
    expect(roles.map(r => r.id)).toEqual([
      'marketing', 'engineering', 'sales', 'support', 'executive', 'hr'
    ]);
  });

  test('each role has conversation with at least 4 messages', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.getRoles().forEach(role => {
      expect(role.conversation.length).toBeGreaterThanOrEqual(4);
      role.conversation.forEach(msg => {
        expect(['user', 'agent']).toContain(msg.role);
        expect(msg.text.length).toBeGreaterThan(0);
      });
    });
  });

  test('init selects first role by default', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    expect(window.RoleDemoPicker.getActiveRole()).toBe('marketing');
  });

  test('init sets aria-pressed on first button', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    const btn = document.querySelector('[data-role="marketing"]');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.classList.contains('active')).toBe(true);
  });

  test('selectRole changes active role', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    window.RoleDemoPicker.selectRole('engineering');
    expect(window.RoleDemoPicker.getActiveRole()).toBe('engineering');
  });

  test('selectRole updates button states', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    window.RoleDemoPicker.selectRole('sales');

    const salesBtn = document.querySelector('[data-role="sales"]');
    const marketingBtn = document.querySelector('[data-role="marketing"]');
    expect(salesBtn.classList.contains('active')).toBe(true);
    expect(salesBtn.getAttribute('aria-pressed')).toBe('true');
    expect(marketingBtn.classList.contains('active')).toBe(false);
    expect(marketingBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('selectRole renders conversation bubbles', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    window.RoleDemoPicker.selectRole('support');

    const messages = document.querySelector('.role-chat-messages');
    // header + 4 conversation bubbles
    expect(messages.children.length).toBe(5);
  });

  test('conversation has correct role classes', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const bubbles = document.querySelectorAll('.role-chat-bubble');
    expect(bubbles[0].classList.contains('role-chat-user')).toBe(true);
    expect(bubbles[1].classList.contains('role-chat-agent')).toBe(true);
  });

  test('chat header shows role info', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    window.RoleDemoPicker.selectRole('executive');

    const header = document.querySelector('.role-chat-header');
    expect(header.textContent).toContain('Executive');
    expect(header.textContent).toContain('📈');
  });

  test('clicking button selects that role', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const hrBtn = document.querySelector('[data-role="hr"]');
    hrBtn.click();
    expect(window.RoleDemoPicker.getActiveRole()).toBe('hr');
    expect(hrBtn.classList.contains('active')).toBe(true);
  });

  test('chat bubbles have label and text spans', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const bubble = document.querySelector('.role-chat-bubble');
    expect(bubble.querySelector('.role-chat-label')).not.toBeNull();
    expect(bubble.querySelector('.role-chat-text')).not.toBeNull();
  });

  test('user bubble label says "You"', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const userBubble = document.querySelector('.role-chat-user .role-chat-label');
    expect(userBubble.textContent).toBe('You');
  });

  test('agent bubble label says "AgentBox"', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const agentBubble = document.querySelector('.role-chat-agent .role-chat-label');
    expect(agentBubble.textContent).toBe('AgentBox');
  });

  test('selectRole with invalid id does nothing', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();
    window.RoleDemoPicker.selectRole('nonexistent');
    expect(window.RoleDemoPicker.getActiveRole()).toBe('marketing');
  });

  test('switching roles replaces conversation', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const messages = document.querySelector('.role-chat-messages');
    const firstText = messages.textContent;

    window.RoleDemoPicker.selectRole('engineering');
    expect(messages.textContent).not.toBe(firstText);
    expect(messages.textContent).toContain('PR');
  });

  test('getRoles returns a copy', () => {
    buildSection();
    loadModule();
    const roles1 = window.RoleDemoPicker.getRoles();
    const roles2 = window.RoleDemoPicker.getRoles();
    expect(roles1).not.toBe(roles2);
    expect(roles1).toEqual(roles2);
  });

  test('init without section does not throw', () => {
    loadModule();
    expect(() => window.RoleDemoPicker.init()).not.toThrow();
    expect(window.RoleDemoPicker.getActiveRole()).toBeNull();
  });

  test('messages container has role=list', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const messages = document.querySelector('.role-chat-messages');
    expect(messages.getAttribute('role')).toBe('list');
  });

  test('each bubble has role=listitem', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const bubbles = document.querySelectorAll('.role-chat-bubble');
    bubbles.forEach(b => {
      expect(b.getAttribute('role')).toBe('listitem');
    });
  });

  test('all 6 roles render without error', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const roleIds = ['marketing', 'engineering', 'sales', 'support', 'executive', 'hr'];
    roleIds.forEach(id => {
      expect(() => window.RoleDemoPicker.selectRole(id)).not.toThrow();
      expect(window.RoleDemoPicker.getActiveRole()).toBe(id);
      expect(document.querySelectorAll('.role-chat-bubble').length).toBeGreaterThanOrEqual(4);
    });
  });

  test('only one button is active at a time', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.init();

    const roleIds = ['engineering', 'sales', 'hr'];
    roleIds.forEach(id => {
      window.RoleDemoPicker.selectRole(id);
      const activeButtons = document.querySelectorAll('.role-picker-btn.active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].getAttribute('data-role')).toBe(id);
    });
  });

  test('each role has description field', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.getRoles().forEach(role => {
      expect(role.description).toBeDefined();
      expect(role.description.length).toBeGreaterThan(0);
    });
  });

  test('each role has icon and label', () => {
    buildSection();
    loadModule();
    window.RoleDemoPicker.getRoles().forEach(role => {
      expect(role.icon).toBeDefined();
      expect(role.label).toBeDefined();
    });
  });
});
