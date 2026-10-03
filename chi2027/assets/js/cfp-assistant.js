// The model sees the current CFP through the server. Credentials never enter this page.
const assistant = document.querySelector('[data-cfp-assistant]');
if (assistant) {
  const disclosure = assistant.querySelector('[data-assistant-disclosure]');
  const unavailable = assistant.querySelector('[data-assistant-unavailable]');
  const form = assistant.querySelector('form');
  const input = form.querySelector('textarea');
  const submit = form.querySelector('[data-assistant-submit]');
  const clear = form.querySelector('[data-assistant-clear]');
  const status = assistant.querySelector('[data-assistant-status]');
  const results = assistant.querySelector('[data-assistant-results]');
  let available = false;

  const checkAvailability = async () => {
    try {
      const response = await fetch('/api/cfp-status', { cache: 'no-store' });
      const data = response.ok ? await response.json() : {};
      available = data.available === true;
    } catch (_) {
      available = false;
    }
    submit.disabled = !available;
    disclosure.hidden = !available;
    unavailable.hidden = available;
    status.textContent = available
      ? 'Ready to explore connections to the CFP.'
      : 'The assistant is not available yet. You can explore contribution formats above and topics below.';
  };
  checkAvailability();

  const openTopic = topic => {
    const target = document.getElementById(topic.id);
    if (!target) return;
    const disclosure = target.closest('details');
    if (disclosure) disclosure.open = true;
    target.tabIndex = -1;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  };

  const renderSuggestions = data => {
    if (!data.result || !Array.isArray(data.result.suggestions) || data.result.suggestions.length > 3
      || !Array.isArray(data.topics) || !Array.isArray(data.contribution_types)) throw new Error('invalid_response');
    const result = data.result;
    if (!['suggestions', 'needs_detail', 'no_clear_connection'].includes(result.status)) throw new Error('invalid_response');
    const topicMap = new Map(data.topics.map(topic => [topic.id, topic]));
    const typeMap = new Map(data.contribution_types.map(type => [type.id, type.name]));
    const fragment = document.createDocumentFragment();
    for (const suggestion of result.suggestions) {
      const topic = topicMap.get(suggestion.topic_id);
      if (!topic || typeof topic.name !== 'string' || !document.getElementById(topic.id)
        || typeof suggestion.reason !== 'string' || typeof suggestion.angle !== 'string'
        || !Array.isArray(suggestion.contribution_type_ids)
        || suggestion.contribution_type_ids.some(id => typeof typeMap.get(id) !== 'string')) throw new Error('invalid_response');
      const card = document.createElement('section');
      card.className = 'finder-result assistant-suggestion';
      const heading = document.createElement('h3');
      const topicButton = document.createElement('button');
      topicButton.type = 'button';
      topicButton.className = 'assistant-topic';
      topicButton.textContent = `${topic.name} ↓`;
      topicButton.addEventListener('click', () => openTopic(topic));
      heading.append(topicButton);
      const reason = document.createElement('p');
      reason.textContent = suggestion.reason;
      const angle = document.createElement('p');
      const angleLabel = document.createElement('strong');
      angleLabel.textContent = 'Possible angle: ';
      angle.append(angleLabel, document.createTextNode(suggestion.angle));
      const types = document.createElement('p');
      types.className = 'assistant-types';
      types.textContent = `Possible formats: ${suggestion.contribution_type_ids.map(id => typeMap.get(id)).join(', ')}.`;
      card.append(heading, reason, angle, types);
      fragment.append(card);
    }
    if (result.follow_up !== null && typeof result.follow_up !== 'string') throw new Error('invalid_response');
    if (result.follow_up) {
      const followUp = document.createElement('p');
      followUp.className = 'assistant-followup';
      followUp.textContent = result.follow_up;
      fragment.append(followUp);
    }
    results.replaceChildren(fragment);
    status.textContent = result.status === 'suggestions'
      ? 'Possible connections to the CFP — follow a topic link to read its full description.'
      : result.status === 'needs_detail'
        ? 'A little more context would help. You can revise your description and try again.'
        : 'No clear connection emerged from this description. You can add more context or explore the full topics below.';
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || !available) return;
    const description = input.value.trim();
    if (description.length < 20) {
      status.textContent = 'Please add a little more detail about your work.';
      input.focus();
      return;
    }
    submit.disabled = clear.disabled = true;
    input.readOnly = true;
    submit.textContent = 'Generating suggestions…';
    results.replaceChildren();
    results.setAttribute('aria-busy', 'true');
    status.textContent = 'Reading your description alongside the workshop topics…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch('/api/cfp-suggestions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        status.textContent = typeof data.error?.message === 'string'
          ? data.error.message : 'Suggestions are unavailable right now. Please try again later.';
      } else {
        renderSuggestions(data);
      }
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'This request took too long. Please try again.'
        : 'Suggestions could not be loaded. Please try again; the full CFP is available below.';
    } finally {
      clearTimeout(timeout);
      results.removeAttribute('aria-busy');
      submit.disabled = !available;
      clear.disabled = false;
      input.readOnly = false;
      submit.textContent = 'Suggest contribution angles';
    }
  });
  clear.addEventListener('click', () => {
    form.reset();
    results.replaceChildren();
    status.textContent = available ? 'Ready to explore connections to the CFP.' : 'The full CFP is available below.';
    input.focus();
  });
}
