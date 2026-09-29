/**
 * Ideacubator Application Flow Controller (assets/js/application.js)
 * Manages the multi-step founder submission, dynamic userType fields,
 * draft recovery, and AI review rendering.
 */
(function () {
  'use strict';

  let currentStep = 1;
  const totalSteps = 4;
  let attachedFiles = [];

  const form = document.getElementById('ideaForm');
  const authGate = document.getElementById('authGate');
  const alertBox = document.getElementById('alert');
  const successBox = document.getElementById('success');

  // Error banner helpers
  function showError(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'alert error show';
    const card = document.querySelector('.card');
    if (card) {
      window.scrollTo({ top: card.offsetTop - 80, behavior: 'smooth' });
    }
  }

  function clearError() {
    if (!alertBox) return;
    alertBox.className = 'alert';
    alertBox.textContent = '';
  }

  // Validate required inputs within the active panel
  function validateCurrentPanel(panelIndex) {
    const panel = document.querySelector(`[data-panel="${panelIndex}"]`);
    if (!panel) return true;

    let valid = true;
    panel.querySelectorAll('[required]').forEach(el => {
      const isInvalid = !el.value.trim() || (el.validity && el.validity.typeMismatch);
      const fieldContainer = el.closest('.field');
      if (fieldContainer) {
        fieldContainer.classList.toggle('invalid', isInvalid);
      }
      if (isInvalid) valid = false;
    });

    if (!valid) {
      showError('Please complete all required fields before continuing.');
    }
    return valid;
  }

  // Step transition
  window.goToStep = function (direction) {
    clearError();
    const currentPanel = document.querySelector(`[data-panel="${currentStep}"]`);

    // Only validate when stepping forward
    if (direction > 0 && !validateCurrentPanel(currentStep)) {
      return;
    }

    currentStep = Math.max(1, Math.min(totalSteps, currentStep + direction));

    // Update panels
    document.querySelectorAll('.panel').forEach(p => {
      const idx = Number(p.dataset.panel);
      p.style.display = idx === currentStep ? 'block' : 'none';
    });

    // Update progress indicator
    document.querySelectorAll('.progress span').forEach(sp => {
      const idx = Number(sp.dataset.p);
      sp.classList.toggle('active', idx === currentStep);
      sp.classList.toggle('done', idx < currentStep);
    });

    // Update sidebar steps if present
    document.querySelectorAll('[id^=s]').forEach((sl, idx) => {
      sl.classList.toggle('active', idx + 1 === currentStep);
    });

    // Update action buttons
    const backBtn = document.getElementById('back');
    const nextBtn = document.getElementById('next');
    const submitBtn = document.getElementById('submit');

    if (backBtn) backBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    if (nextBtn) nextBtn.style.display = currentStep < totalSteps ? 'inline-flex' : 'none';
    if (submitBtn) submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';

    if (currentStep === totalSteps) {
      renderSummary();
    }

    const card = document.querySelector('.card');
    if (card) {
      window.scrollTo({ top: card.offsetTop - 80, behavior: 'smooth' });
    }
  };

  // Render application review summary on step 4
  function renderSummary() {
    const summaryContainer = document.getElementById('summary');
    if (!summaryContainer || !form) return;

    const payload = window.buildApplicationPayload(form);
    summaryContainer.innerHTML = `
      <div class="row">
        <div>
          <div class="row-title">${window.escapeHtml(payload.profile.fullName || 'Anonymous Founder')}</div>
          <div class="row-meta">${window.escapeHtml(payload.profile.email)} · ${window.escapeHtml(payload.profile.userType)} · ${window.escapeHtml(payload.profile.location || 'Location not specified')}</div>
        </div>
      </div>
      <div class="row">
        <div>
          <div class="row-title">${window.escapeHtml(payload.idea.title || 'Untitled Working Concept')}</div>
          <div class="row-meta">Stage: ${window.escapeHtml(payload.idea.currentStage || 'Idea only')} · Market: ${window.escapeHtml(payload.idea.geography || 'Global')}</div>
        </div>
      </div>
      <div class="row">
        <div>
          <div class="row-title">Description</div>
          <div class="row-meta">${window.escapeHtml(payload.idea.description || '—')}</div>
        </div>
      </div>
      ${payload.idea.problem ? `
      <div class="row">
        <div>
          <div class="row-title">Problem Solved</div>
          <div class="row-meta">${window.escapeHtml(payload.idea.problem)}</div>
        </div>
      </div>` : ''}
      ${payload.idea.customer ? `
      <div class="row">
        <div>
          <div class="row-title">Target Customer</div>
          <div class="row-meta">${window.escapeHtml(payload.idea.customer)}</div>
        </div>
      </div>` : ''}
      <div class="row">
        <div>
          <div class="row-title">Documents Attached</div>
          <div class="row-meta">${attachedFiles.length > 0 ? attachedFiles.map(f => window.escapeHtml(f.name)).join(', ') : 'None attached (optional)'}</div>
        </div>
      </div>
    `;
  }

  // Dynamic userType field generator
  function renderSpecificFields() {
    const userType = form.userType.value;
    const specificContainer = document.getElementById('specific');
    if (!specificContainer) return;

    const inputField = (name, label, placeholder, req = '') => `
      <div class="field">
        <label class="label">${label}${req ? ' <span class="required">*</span>' : ''}</label>
        <input name="${name}" ${req ? 'required' : ''} placeholder="${placeholder}">
      </div>`;

    const textareaField = (name, label, placeholder) => `
      <div class="field full">
        <label class="label">${label}</label>
        <textarea name="${name}" placeholder="${placeholder}" style="min-height:90px"></textarea>
      </div>`;

    let html = '';

    switch (userType) {
      case 'student':
        html = inputField('education', 'Education / Course', 'e.g. B.Tech Computer Science, 2026') +
               inputField('cofounderStatus', 'Co-founder Situation', 'Solo / looking / committed team') +
               textareaField('studentContext', 'Why are you uniquely close to this problem?', 'Explain how you encountered this problem in your studies or campus life.');
        break;

      case 'professional':
        html = inputField('employmentContext', 'Current Employment Status', 'e.g. Employed full-time / on notice / ready to transition') +
               inputField('industryExperience', 'Domain Expertise', 'e.g. 10 years supply chain operations');
        break;

      case 'seed':
      case 'vc':
        html = inputField('companyName', 'Company / Entity Name', 'Registered company name', 'required') +
               inputField('revenueRange', 'Revenue / Metrics', 'e.g. $15K MRR, 4,000 active users') +
               inputField('fundingStage', 'Prior Capital', 'Bootstrapped / friends & family / angel');
        break;

      case 'sell':
        html = inputField('companyName', 'Business Name', 'Entity name', 'required') +
               inputField('ownershipSituation', 'Ownership Structure', 'Solo owner / partnership / equity split') +
               textareaField('saleContext', 'What are you looking to achieve?', 'Timeline, valuation expectations, or reasons for exploring an exit.');
        break;

      case 'ipo':
        html = inputField('companyName', 'Company Name', 'Entity name', 'required') +
               inputField('companyScale', 'Current Scale & EBITDA', 'Revenue scale, team size, profitability') +
               textareaField('ipoContext', 'Public market objectives', 'Rationale for exploring SME / Mainboard public listing.');
        break;

      case 'test':
        html = inputField('validationWindow', 'Target Validation Horizon', 'e.g. 6 to 10 weeks') +
               textareaField('validationQuestion', 'What assumption do you most need to test?', 'What is the biggest unknown before full commitment?');
        break;

      case 'value':
        html = inputField('companyName', 'Business Name', 'Entity name', 'required') +
               inputField('valuationPurpose', 'Valuation Purpose', 'Fundraising / buyout / strategic restructuring') +
               textareaField('valuationContext', 'Financial overview', 'Key historical revenue and margin figures.');
        break;

      case 'intl-out':
        html = inputField('companyName', 'Current Indian Business', 'Entity name', 'required') +
               inputField('targetMarket', 'Target International Region', 'North America / Europe / Southeast Asia / Middle East') +
               textareaField('expansionContext', 'Why this target market?', 'Existing inbound demand, product-market fit, or customer pipeline.');
        break;

      case 'intl-in':
        html = inputField('companyName', 'Global Company Name', 'Entity name', 'required') +
               inputField('homeMarket', 'Home Market & HQ', 'e.g. Singapore / London / San Francisco') +
               textareaField('indiaContext', 'What are you seeking in an India venture partner?', 'Local product adaptation, distribution, regulatory compliance, engineering.');
        break;
    }

    specificContainer.innerHTML = html;
    specificContainer.style.display = html ? 'grid' : 'none';
  }

  // File drop & list handling
  function setupFileUpload() {
    const fileInput = document.getElementById('files');
    const dropArea = document.getElementById('drop');
    if (!fileInput || !dropArea) return;

    fileInput.addEventListener('change', (e) => addSelectedFiles(e.target.files));

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('drag');
    });

    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag'));

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files) {
        addSelectedFiles(e.dataTransfer.files);
      }
    });
  }

  function addSelectedFiles(fileList) {
    const allowedExtensions = /\.(pdf|doc|docx|ppt|pptx)$/i;
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!allowedExtensions.test(file.name)) {
        showError(`"${file.name}" is not a supported document format (PDF, DOC, DOCX, PPT, PPTX only).`);
        continue;
      }
      if (file.size > maxFileSize) {
        showError(`"${file.name}" exceeds the 10MB file size limit.`);
        continue;
      }
      attachedFiles.push(file);
    }
    renderFileList();
  }

  function renderFileList() {
    const fileContainer = document.getElementById('fileList');
    if (!fileContainer) return;

    fileContainer.innerHTML = attachedFiles.map((file, idx) => `
      <div class="file">
        <span>${window.escapeHtml(file.name)} <span class="help">(${window.formatFileSize(file.size)})</span></span>
        <button type="button" class="text-btn" data-index="${idx}">Remove</button>
      </div>
    `).join('');

    fileContainer.querySelectorAll('[data-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = Number(e.target.dataset.index);
        attachedFiles.splice(index, 1);
        renderFileList();
      });
    });
  }

  // Draft persistence
  window.saveApplicationDraft = function () {
    if (!form) return;
    const payload = window.buildApplicationPayload(form);
    localStorage.setItem('ic_application_draft', JSON.stringify(payload));
    window.portalToast('Draft saved on this device.', 'success');
  };

  function restoreDraft() {
    const saved = localStorage.getItem('ic_application_draft');
    if (!saved || !form) return;

    try {
      const draft = JSON.parse(saved);
      if (draft.profile) {
        if (draft.profile.fullName) form.fullName.value = draft.profile.fullName;
        if (draft.profile.email) form.email.value = draft.profile.email;
        if (draft.profile.phone) form.phone.value = draft.profile.phone;
        if (draft.profile.location) form.location.value = draft.profile.location;
        if (draft.profile.role) form.role.value = draft.profile.role;
        if (draft.profile.experienceYears) form.experienceYears.value = draft.profile.experienceYears;
        if (draft.profile.linkedIn) form.linkedIn.value = draft.profile.linkedIn;
        if (draft.profile.userType) {
          form.userType.value = draft.profile.userType;
          renderSpecificFields();
        }
      }
      if (draft.idea) {
        if (draft.idea.title) form.ideaTitle.value = draft.idea.title;
        if (draft.idea.description) form.ideaDescription.value = draft.idea.description;
        if (draft.idea.problem) form.problem.value = draft.idea.problem;
        if (draft.idea.customer) form.customer.value = draft.idea.customer;
        if (draft.idea.currentStage) form.currentStage.value = draft.idea.currentStage;
        if (draft.idea.traction) form.traction.value = draft.idea.traction;
        if (draft.idea.monetization) form.monetization.value = draft.idea.monetization;
        if (draft.idea.geography) form.geography.value = draft.idea.geography;
        if (draft.idea.team) form.team.value = draft.idea.team;
        if (draft.idea.founderCommitment) form.founderCommitment.value = draft.idea.founderCommitment;
        if (draft.idea.supportNeeded) form.supportNeeded.value = draft.idea.supportNeeded;
        if (draft.idea.additionalContext) form.additionalContext.value = draft.idea.additionalContext;
      }
      if (draft.extra) {
        for (const [k, v] of Object.entries(draft.extra)) {
          if (form[k]) form[k].value = v;
        }
      }
      window.portalToast('Restored your previous draft.', 'info');
    } catch (err) {
      console.warn('Could not restore draft:', err);
    }
  }

  // AI Review execution
  window.triggerAIReview = async function () {
    clearError();
    if (!validateCurrentPanel(2)) {
      currentStep = 2;
      window.goToStep(0);
      return;
    }

    const aiBtn = document.getElementById('aiBtn');
    const aiResult = document.getElementById('aiResult');
    if (!aiBtn || !aiResult) return;

    aiBtn.disabled = true;
    aiBtn.textContent = 'Reviewing your idea…';
    aiResult.className = 'review-result show';
    aiResult.innerHTML = '<div class="loading"><span class="spinner"></span> Analyzing your problem, market, and business model…</div>';

    try {
      const payload = window.buildApplicationPayload(form);
      const result = await window.reviewIdeaWithAI({
        profile: payload.profile,
        idea: payload.idea,
        extra: payload.extra
      });

      const renderList = (items) => Array.isArray(items) && items.length > 0
        ? `<ul class="review-list">${items.map(item => `<li>${window.escapeHtml(item)}</li>`).join('')}</ul>`
        : `<p>${window.escapeHtml(items || '—')}</p>`;

      aiResult.innerHTML = `
        <div class="review-grid">
          <div class="review-item">
            <strong>Clarity Rating</strong>
            <p style="font-size:18px;font-weight:700;color:var(--brown);">${result.clarityScore != null ? result.clarityScore + '/10' : '—'}</p>
          </div>
          <div class="review-item">
            <strong>One-Line Synthesis</strong>
            <p>${window.escapeHtml(result.oneLineSummary || '—')}</p>
          </div>
          <div class="review-item">
            <strong>Problem Formulation</strong>
            <p>${window.escapeHtml(result.problemAssessment || '—')}</p>
          </div>
          <div class="review-item">
            <strong>Customer & Market</strong>
            <p>${window.escapeHtml(result.customerAssessment || '—')}</p>
          </div>
          <div class="review-item full">
            <strong>Promising Areas</strong>
            ${renderList(result.promisingPoints)}
          </div>
          <div class="review-item full">
            <strong>Open Assumptions to Test</strong>
            ${renderList(result.openQuestions)}
          </div>
          <div class="review-item full">
            <strong>Suggested First Experiment / MVP Scope</strong>
            <p>${window.escapeHtml(result.nextExperiment || '—')}</p>
          </div>
          <div class="review-item full">
            <strong>Immediate Founder Action Items</strong>
            ${renderList(result.recommendedFounderActions)}
          </div>
        </div>
        <div style="margin-top:14px;display:flex;justify-content:flex-end;">
          <button type="button" class="text-btn" onclick="goToStep(-2)">← Return to Step 2 to refine idea details</button>
        </div>
      `;

      window.portalToast('AI review completed.', 'success');
    } catch (err) {
      console.error('AI Review Error:', err);
      aiResult.className = 'review-result';
      showError(err.message || 'AI review was unavailable. You can proceed with standard submission.');
    } finally {
      aiBtn.disabled = false;
      aiBtn.textContent = '✦ Review my idea with AI';
    }
  };

  // Submit Application
  window.submitApplication = async function () {
    clearError();
    const consent = document.getElementById('consent');
    if (consent && !consent.checked) {
      showError('Please confirm the accuracy of your submission and terms agreement before submitting.');
      return;
    }

    const submitBtn = document.getElementById('submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Submitting to Ideacubator…';
    }

    try {
      const payload = window.buildApplicationPayload(form);
      const applicationId = await window.saveApplication(payload, attachedFiles);

      // Clean up draft
      localStorage.removeItem('ic_application_draft');

      // Show success screen smoothly
      if (form) form.style.display = 'none';
      if (successBox) successBox.classList.add('show');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      window.portalToast('Application submitted successfully!', 'success');
    } catch (err) {
      console.error('Submission failed:', err);
      showError(err.message || 'We could not submit your application. Please check your connection and try again.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit application →';
      }
    }
  };

  // Auth gate callback
  function handleAuthenticatedUser(user) {
    if (!user) return;
    if (authGate) authGate.style.display = 'none';
    if (form) form.style.display = 'block';

    if (form.fullName && !form.fullName.value && user.displayName) {
      form.fullName.value = user.displayName;
    }
    if (form.email && !form.email.value && user.email) {
      form.email.value = user.email;
    }

    restoreDraft();
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    if (form && form.userType) {
      form.userType.addEventListener('change', renderSpecificFields);
    }

    setupFileUpload();

    // Check Firebase Auth state
    if (window.IC_AUTH) {
      window.IC_AUTH.onAuthStateChanged(user => {
        if (user) {
          handleAuthenticatedUser(user);
        } else {
          if (authGate) authGate.style.display = 'grid';
          if (form) form.style.display = 'none';
        }
      });
    }

    // Step navigation wiring
    const nextBtn = document.getElementById('next');
    const backBtn = document.getElementById('back');
    const submitBtn = document.getElementById('submit');
    const draftBtn = document.querySelector('[onclick="saveDraft()"]');

    if (nextBtn) nextBtn.onclick = () => window.goToStep(1);
    if (backBtn) backBtn.onclick = () => window.goToStep(-1);
    if (submitBtn) submitBtn.onclick = () => window.submitApplication();
    if (draftBtn) draftBtn.onclick = () => window.saveApplicationDraft();
  });
})();
