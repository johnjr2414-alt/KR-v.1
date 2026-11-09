var T=Object.defineProperty;var C=(a,e,t)=>e in a?T(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var p=(a,e,t)=>C(a,typeof e!="symbol"?e+"":e,t);import{J as x,f as m,Q as h,K as A,E as b,S as y,L as $,M as f,N as j,O as k,R as I,V as w,W as _,X as R,Y as M}from"./index-CAsaZBIi.js";import"./phaser-B61OQUcB.js";function g(a){return a?a.split(",").map(e=>e.trim()).filter(e=>e!==""):[]}function v(a){const e=(a??"").trim();return e===""?NaN:Number.parseInt(e,10)}function S(a){const e=a.indexOf("["),t=a.indexOf(".");let i=a.length;return e>=0&&(i=Math.min(i,e)),t>=0&&(i=Math.min(i,t)),a.slice(0,i)}function E(a){const e=a.type,t={educationalTier:a.educationalTier,subject:a.subject,topic:(a.topic??"").trim(),difficulty:v(a.difficulty),type:e,question:(a.question??"").trim(),timeLimit:v(a.timeLimit),baseMasteryExp:v(a.baseMasteryExp),status:a.status},i=(a.explanation??"").trim();i!==""&&(t.explanation=i);const s=(a.reviewStatus??"").trim();s!==""&&(t.reviewStatus=s);const r=g(a.tags);if(r.length>0&&(t.tags=r),e===m.MultipleChoice){const n=(a.choices??[]).map(c=>({choiceId:(c.choiceId??"").trim(),text:(c.text??"").trim()})).filter(c=>c.choiceId!==""||c.text!=="");t.choices=n;const o=(a.correctChoiceId??"").trim();o!==""&&(t.correctAnswer=o)}else if(e===m.Identification){const n=(a.correctAnswer??"").trim();n!==""&&(t.correctAnswer=n);const o=g(a.acceptedAnswers);o.length>0&&(t.acceptedAnswers=o)}else if(e===m.Essay){const n=(a.expectedAnswer??"").trim();n!==""&&(t.expectedAnswer=n)}return t}const D=new Set(["id","createdAt","updatedAt"]);function F(a){const e={};for(const t of a){const i=S(t.field);(e[i]??(e[i]=[])).push(t.message)}return e}function O(a){const e=E(a),i=x.validate(e).errors.filter(s=>!D.has(S(s.field)));return{draft:e,isValid:i.length===0,errors:i,byField:F(i)}}function Q(a){if(a.type===m.MultipleChoice&&Array.isArray(a.choices)){const e=(a.correctAnswer??"").trim().toLowerCase(),t=a.choices.find(i=>((i==null?void 0:i.choiceId)??"").trim().toLowerCase()===e);if(t)return`${t.choiceId.toUpperCase()}: ${t.text}`}return a.type===m.Essay?a.expectedAnswer??null:a.correctAnswer??a.expectedAnswer??null}function N(a){const e=x.validate(a),t=(a.choices??[]).map(s=>({choiceId:s.choiceId,label:(s.choiceId??"").toUpperCase(),text:s.text,isCorrect:(s.choiceId??"").trim().toLowerCase()===(a.correctAnswer??"").trim().toLowerCase()})),i=e.isValid&&a.status===h.Published;return{id:a.id??"",subject:a.subject??null,educationalTier:a.educationalTier??null,topic:a.topic??"",difficulty:a.difficulty??null,type:a.type??null,prompt:a.question??"",timeLimit:a.timeLimit??null,baseMasteryExp:a.baseMasteryExp??null,choices:t,correctAnswerText:Q(a),acceptedAnswers:Array.isArray(a.acceptedAnswers)?[...a.acceptedAnswers]:[],expectedAnswer:a.expectedAnswer??null,explanation:a.explanation??null,playable:i,issues:e.errors}}class q{constructor(e,t){p(this,"container",null);p(this,"manager");p(this,"onExit");p(this,"activePanel","list");p(this,"editingQuestion",null);p(this,"choiceCount",4);p(this,"lastListCriteria",{});p(this,"lastBackup",null);p(this,"panelSwitchTimer",null);this.manager=e,this.onExit=t}getActivePanel(){return this.activePanel}show(){this.destroy();const e=document.createElement("div");e.id="admin-dashboard",e.innerHTML=this.buildLayout(),document.body.appendChild(e),this.container=e;const t=e.querySelector(".admin__security-banner");t&&(t.textContent=`⚠️ ${A}`),this.bindNavigation(),this.switchPanel("list")}destroy(){this.panelSwitchTimer!==null&&(clearTimeout(this.panelSwitchTimer),this.panelSwitchTimer=null),this.container&&(this.container.remove(),this.container=null)}buildLayout(){return`
      <nav class="admin__sidebar">
        <div class="admin__sidebar-title">🛡️ Admin Panel</div>
        <button class="admin__nav-btn" data-panel="list">📋 Question List</button>
        <button class="admin__nav-btn" data-panel="add">➕ Add Question</button>
        <button class="admin__nav-btn" data-panel="import-export">📦 Import / Export</button>
        <button class="admin__nav-btn admin__nav-btn--exit" data-action="exit">🚪 Exit Admin</button>
      </nav>
      <main class="admin__content">
        <div class="admin__security-banner" role="note"></div>
        <section id="panel-list" class="admin__panel"></section>
        <section id="panel-add" class="admin__panel"></section>
        <section id="panel-import-export" class="admin__panel"></section>
      </main>
    `}bindNavigation(){this.container&&this.container.querySelectorAll(".admin__nav-btn").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.panel;if(e.dataset.action==="exit"){this.destroy(),this.onExit();return}t&&this.switchPanel(t)})})}switchPanel(e){if(!this.container)return;this.activePanel=e,this.editingQuestion=null,this.container.querySelectorAll(".admin__nav-btn").forEach(i=>{i.classList.toggle("admin__nav-btn--active",i.dataset.panel===e)}),this.container.querySelectorAll(".admin__panel").forEach(i=>{i.classList.remove("admin__panel--active")});const t=this.container.querySelector(`#panel-${e}`);t&&(t.classList.add("admin__panel--active"),e==="list"?this.renderList(t):e==="add"?this.renderForm(t):e==="import-export"&&this.renderImportExport(t))}renderForm(e,t){var l;this.editingQuestion=t??null,this.choiceCount=((l=t==null?void 0:t.choices)==null?void 0:l.length)??4;const i=!!t,s=t,r=Object.values(b).map(u=>`<option value="${u}" ${(s==null?void 0:s.educationalTier)===u?"selected":""}>${u}</option>`).join(""),n=Object.values(y).map(u=>`<option value="${u}" ${(s==null?void 0:s.subject)===u?"selected":""}>${u}</option>`).join(""),o=Object.values(m).map(u=>`<option value="${u}" ${(s==null?void 0:s.type)===u?"selected":""}>${u}</option>`).join(""),c=Object.values(h).map(u=>`<option value="${u}" ${(s==null?void 0:s.status)===u?"selected":""}>${u}</option>`).join(""),d=Object.values($).map(u=>`<option value="${u}" ${(s==null?void 0:s.reviewStatus)===u?"selected":""}>${u}</option>`).join("");e.innerHTML=`
      <div class="admin-form">
        <h2 class="admin-form__title">${i?"✏️ Edit Question":"➕ Add Question"}</h2>
        <div id="form-messages"></div>
        <form id="question-form">
          <div class="admin-form__row">
            <label class="admin-form__label">Educational Tier</label>
            <select class="admin-form__select" name="educationalTier">${r}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Subject</label>
            <select class="admin-form__select" name="subject">${n}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Topic</label>
            <input class="admin-form__input" name="topic" value="${this.esc((s==null?void 0:s.topic)??"")}" placeholder="e.g. fractions, photosynthesis" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Difficulty (1–5)</label>
            <input class="admin-form__input" name="difficulty" type="number" min="1" max="5" value="${(s==null?void 0:s.difficulty)??1}" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Question Type</label>
            <select class="admin-form__select" name="type" id="question-type-select">${o}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Question Text</label>
            <textarea class="admin-form__textarea" name="question" rows="3" placeholder="Enter the question stem...">${this.esc((s==null?void 0:s.question)??"")}</textarea>
          </div>
          <div class="admin-form__row" id="choices-section">
            <label class="admin-form__label">Choices (select the correct answer)</label>
            <div class="admin-form__choices-container" id="choices-container"></div>
            <button type="button" class="admin-form__add-choice-btn" id="add-choice-btn">+ Add Choice</button>
          </div>
          <div class="admin-form__row" id="correct-answer-section">
            <label class="admin-form__label">Correct Answer</label>
            <input class="admin-form__input" name="correctAnswer" value="${this.esc((s==null?void 0:s.correctAnswer)??"")}" placeholder="Canonical correct answer text" />
          </div>
          <div class="admin-form__row" id="accepted-answers-section">
            <label class="admin-form__label">Accepted Answers (comma-separated alternatives)</label>
            <input class="admin-form__input" name="acceptedAnswers" value="${this.esc(((s==null?void 0:s.acceptedAnswers)??[]).join(", "))}" placeholder="e.g. H2O, h2o" />
          </div>
          <div class="admin-form__row" id="expected-answer-section">
            <label class="admin-form__label">Expected Answer / Grading Reference</label>
            <textarea class="admin-form__textarea" name="expectedAnswer" rows="3">${this.esc((s==null?void 0:s.expectedAnswer)??"")}</textarea>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Explanation</label>
            <textarea class="admin-form__textarea" name="explanation" rows="2">${this.esc((s==null?void 0:s.explanation)??"")}</textarea>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Time Limit (seconds)</label>
            <input class="admin-form__input" name="timeLimit" type="number" min="1" value="${(s==null?void 0:s.timeLimit)??15}" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Base Mastery EXP</label>
            <input class="admin-form__input" name="baseMasteryExp" type="number" min="1" value="${(s==null?void 0:s.baseMasteryExp)??10}" />
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Status</label>
            <select class="admin-form__select" name="status">${c}</select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Review Status (authoring label, optional)</label>
            <select class="admin-form__select" name="reviewStatus">
              <option value="">(no review recorded)</option>
              ${d}
            </select>
          </div>
          <div class="admin-form__row">
            <label class="admin-form__label">Tags (comma-separated)</label>
            <input class="admin-form__input" name="tags" value="${this.esc(((s==null?void 0:s.tags)??[]).join(", "))}" placeholder="e.g. grade-3, algebra" />
          </div>
          <div class="admin-form__actions">
            <button type="submit" class="admin-form__btn admin-form__btn--primary">
              ${i?"Save Changes":"Create Question"}
            </button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-draft-btn">Save as Draft</button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-preview-btn">👁️ Preview as Player</button>
            <button type="button" class="admin-form__btn admin-form__btn--secondary" id="form-cancel-btn">Cancel</button>
          </div>
        </form>
        <div class="admin-form__preview" id="form-preview" hidden></div>
      </div>
    `,this.renderChoicesForType((s==null?void 0:s.type)??m.MultipleChoice,s==null?void 0:s.choices,s==null?void 0:s.correctAnswer),this.bindFormEvents(e,i)}renderChoicesForType(e,t,i){if(!this.container)return;const s=this.container.querySelector("#choices-section"),r=this.container.querySelector("#correct-answer-section"),n=this.container.querySelector("#accepted-answers-section"),o=this.container.querySelector("#expected-answer-section");s.style.display=e===m.MultipleChoice?"block":"none",r.style.display=e===m.Identification?"block":"none",n.style.display=e===m.Identification?"block":"none",o.style.display=e===m.Essay?"block":"none",e===m.MultipleChoice&&this.renderChoiceInputs(t,i)}renderChoiceInputs(e,t){var o;const i=(o=this.container)==null?void 0:o.querySelector("#choices-container");if(!i)return;const s=Math.max(this.choiceCount,2),r="abcdefghij";let n="";for(let c=0;c<s;c++){const d=r[c]??`c${c}`,l=e==null?void 0:e[c],u=(l==null?void 0:l.text)??"",L=t===((l==null?void 0:l.choiceId)??d);n+=`
        <div class="admin-form__choice-row">
          <input type="radio" name="correctChoice" value="${d}" ${L?"checked":""} />
          <span class="admin-form__choice-label">${d.toUpperCase()}:</span>
          <input type="text" class="admin-form__input" data-choice-id="${d}" value="${this.esc(u)}" placeholder="Choice ${d.toUpperCase()}" />
        </div>
      `}i.innerHTML=n}bindFormEvents(e,t){const i=e.querySelector("#question-form"),s=e.querySelector("#question-type-select"),r=e.querySelector("#add-choice-btn"),n=e.querySelector("#form-cancel-btn"),o=e.querySelector("#form-draft-btn"),c=e.querySelector("#form-preview-btn");s==null||s.addEventListener("change",()=>{this.renderChoicesForType(s.value)}),r==null||r.addEventListener("click",()=>{this.choiceCount=Math.min(this.choiceCount+1,10),this.renderChoiceInputs()}),n==null||n.addEventListener("click",()=>{this.switchPanel("list")}),o==null||o.addEventListener("click",()=>{this.handleFormSubmit(i,t,{forceDraft:!0})}),c==null||c.addEventListener("click",()=>{this.renderPreview(i)}),i==null||i.addEventListener("submit",d=>{d.preventDefault(),this.handleFormSubmit(i,t)})}collectDraftInput(e){var r,n;const t=new FormData(e),i=t.get("type"),s={educationalTier:t.get("educationalTier")??"",subject:t.get("subject")??"",topic:t.get("topic")??"",difficulty:t.get("difficulty")??"",type:i??"",question:t.get("question")??"",timeLimit:t.get("timeLimit")??"",baseMasteryExp:t.get("baseMasteryExp")??"",status:t.get("status")??"",reviewStatus:t.get("reviewStatus")??"",explanation:t.get("explanation")??"",tags:t.get("tags")??""};if(i===m.MultipleChoice){const o=((r=this.container)==null?void 0:r.querySelectorAll("[data-choice-id]"))??[],c=[];o.forEach(l=>{c.push({choiceId:l.dataset.choiceId??"",text:l.value})}),s.choices=c;const d=(n=this.container)==null?void 0:n.querySelector('input[name="correctChoice"]:checked');s.correctChoiceId=(d==null?void 0:d.value)??""}else i===m.Identification?(s.correctAnswer=t.get("correctAnswer")??"",s.acceptedAnswers=t.get("acceptedAnswers")??""):i===m.Essay&&(s.expectedAnswer=t.get("expectedAnswer")??"");return s}async handleFormSubmit(e,t,i={}){var c;const s=(c=this.container)==null?void 0:c.querySelector("#form-messages");s&&(s.innerHTML=""),this.clearFieldErrors();const r=this.collectDraftInput(e);i.forceDraft&&(r.status=h.Draft);const n=O(r);if(!n.isValid){this.markFieldErrors(n.byField),this.showValidationErrors(n.errors.map(d=>`${d.field}: ${d.message}`));return}const o=n.draft;try{if(t&&this.editingQuestion){const d=await this.manager.updateQuestion(this.editingQuestion.id,o);if(d.errors&&d.errors.length>0){this.showValidationErrors(d.errors.map(l=>`${l.field}: ${l.message}`));return}this.showSuccessMessage("Question updated successfully.")}else{const d=await this.manager.createQuestion(o);if(d.errors&&d.errors.length>0){this.showValidationErrors(d.errors.map(l=>`${l.field}: ${l.message}`));return}this.showSuccessMessage(i.forceDraft?"Draft saved successfully.":"Question created successfully.")}this.panelSwitchTimer!==null&&clearTimeout(this.panelSwitchTimer),this.panelSwitchTimer=setTimeout(()=>{this.panelSwitchTimer=null,this.switchPanel("list")},800)}catch(d){this.showValidationErrors([d.message])}}clearFieldErrors(){this.container&&(this.container.querySelectorAll(".admin-form__input--error").forEach(e=>e.classList.remove("admin-form__input--error")),this.container.querySelectorAll(".admin-form__error-text").forEach(e=>e.remove()))}markFieldErrors(e){if(!this.container)return;const t=this.container.querySelector("#question-form");if(t)for(const[i,s]of Object.entries(e)){if(i==="choices"){const o=this.container.querySelector("#choices-section");if(o){o.classList.add("admin-form__input--error");const c=document.createElement("div");c.className="admin-form__error-text",c.textContent=s.join(" "),o.appendChild(c)}continue}const r=t.querySelector(`[name="${i}"]`);if(!r)continue;r.classList.add("admin-form__input--error");const n=document.createElement("div");n.className="admin-form__error-text",n.textContent=s.join(" "),r.insertAdjacentElement("afterend",n)}}renderPreview(e){var o;const t=(o=this.container)==null?void 0:o.querySelector("#form-preview");if(!t)return;const i=N(E(this.collectDraftInput(e))),s=i.choices.length>0?i.choices.map(c=>`
          <div class="admin-preview__choice ${c.isCorrect?"admin-preview__choice--correct":""}">
            <span class="admin-preview__choice-label">${this.esc(c.label)}</span>
            <span>${this.esc(c.text)}</span>
            ${c.isCorrect?'<span class="admin-preview__tag">correct</span>':""}
          </div>`).join(""):'<div class="admin-preview__muted">No choices (not a multiple-choice question).</div>',r=i.type===m.Identification?`<div><strong>Accepted answers:</strong> ${this.esc(i.acceptedAnswers.join(", ")||i.correctAnswerText||"—")}</div>`:i.type===m.Essay?`<div><strong>Model answer:</strong> ${this.esc(i.expectedAnswer??"—")}</div>`:`<div><strong>Correct:</strong> ${this.esc(i.correctAnswerText??"—")}</div>`,n=i.issues.length>0?`<div class="admin-preview__issues">${i.issues.map(c=>`• ${this.esc(c.field)}: ${this.esc(c.message)}`).join("<br/>")}</div>`:"";t.hidden=!1,t.innerHTML=`
      <div class="admin-preview">
        <div class="admin-preview__header">
          <span class="admin-preview__badge ${i.playable?"admin-preview__badge--ok":"admin-preview__badge--warn"}">
            ${i.playable?"Playable":"Not playable"}
          </span>
          <span class="admin-preview__meta">
            ${this.esc(i.educationalTier??"—")} · ${this.esc(i.subject??"—")} · ${this.esc(i.topic||"—")}
            · Diff ${i.difficulty??"—"} · ${i.timeLimit??"—"}s · ${i.baseMasteryExp??"—"} EXP
          </span>
        </div>
        <div class="admin-preview__prompt">${this.esc(i.prompt||"(no prompt)")}</div>
        <div class="admin-preview__choices">${s}</div>
        <div class="admin-preview__answer">${r}</div>
        ${i.explanation?`<div class="admin-preview__explanation"><strong>Explanation:</strong> ${this.esc(i.explanation)}</div>`:""}
        ${n}
      </div>
    `}showValidationErrors(e){var i;const t=(i=this.container)==null?void 0:i.querySelector("#form-messages");t&&(t.innerHTML=`
      <div class="admin-form__validation-summary">
        <strong>Validation Errors:</strong><br/>
        ${e.map(s=>`• ${this.esc(s)}`).join("<br/>")}
      </div>
    `)}showSuccessMessage(e){var i;const t=(i=this.container)==null?void 0:i.querySelector("#form-messages");t&&(t.innerHTML=`<div class="admin-form__success-msg">${this.esc(e)}</div>`)}renderList(e){const t=this.manager.getRepository().getAll();e.innerHTML=`
      <h2 class="admin-list__title">📋 Question List</h2>
      <div class="admin-list__filters" id="list-filters">
        <select class="admin-list__filter-select" data-filter="subject">
          <option value="">All Subjects</option>
          ${Object.values(y).map(i=>`<option value="${i}">${this.esc(f(i))}</option>`).join("")}
        </select>
        <select class="admin-list__filter-select" data-filter="topic">
          <option value="">All Topics</option>
          ${j.map(i=>`<option value="${i.id}">${this.esc(f(i.subject))} · ${this.esc(i.displayName)}</option>`).join("")}
        </select>
        <select class="admin-list__filter-select" data-filter="educationalTier">
          <option value="">All Tiers</option>
          ${Object.values(b).map(i=>`<option value="${i}">${i}</option>`).join("")}
        </select>
        <select class="admin-list__filter-select" data-filter="difficulty">
          <option value="">All Difficulties</option>
          ${[1,2,3,4,5].map(i=>`<option value="${i}">${i}</option>`).join("")}
        </select>
        <select class="admin-list__filter-select" data-filter="type">
          <option value="">All Types</option>
          ${Object.values(m).map(i=>`<option value="${i}">${i}</option>`).join("")}
        </select>
        <select class="admin-list__filter-select" data-filter="status">
          <option value="">Published</option>
          ${Object.values(h).map(i=>`<option value="${i}">${i}</option>`).join("")}
        </select>
        <select class="admin-list__filter-select" data-filter="reviewStatus">
          <option value="">All Review States</option>
          ${Object.values($).map(i=>`<option value="${i}">${i}</option>`).join("")}
        </select>
      </div>
      <div class="admin-list__count" id="list-count">${t.length} questions</div>
      <div class="admin-list__coverage" id="list-coverage">${this.buildCoverageText(t)}</div>
      <div class="admin-list__coverage" id="list-review-summary">${this.buildReviewSummaryText(t)}</div>
      <table class="admin-list__table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Subject</th>
            <th>Tier</th>
            <th>Diff</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="list-tbody"></tbody>
      </table>
    `,this.renderTableRows(t),this.bindListFilters(e)}renderTableRows(e){var s,r;const t=(s=this.container)==null?void 0:s.querySelector("#list-tbody"),i=(r=this.container)==null?void 0:r.querySelector("#list-count");if(t){if(i&&(i.textContent=`${e.length} questions`),e.length===0){t.innerHTML='<tr><td colspan="7" style="text-align:center;color:#606080;padding:24px;">No questions found.</td></tr>';return}t.innerHTML=e.map(n=>`
      <tr>
        <td title="${this.esc(n.question)}">${this.esc(n.question.substring(0,60))}${n.question.length>60?"…":""}</td>
        <td>${n.subject}</td>
        <td>${n.educationalTier}</td>
        <td>${n.difficulty}</td>
        <td>${n.type}</td>
        <td>${n.status}</td>
        <td>
          <button class="admin-list__action-btn admin-list__action-btn--edit" data-action="edit" data-id="${n.id}">Edit</button>
          <button class="admin-list__action-btn admin-list__action-btn--delete" data-action="delete" data-id="${n.id}">Delete</button>
        </td>
      </tr>
    `).join(""),t.querySelectorAll("[data-action]").forEach(n=>{n.addEventListener("click",()=>{const o=n.dataset.id;n.dataset.action==="edit"?this.handleEdit(o):n.dataset.action==="delete"&&this.handleDelete(o)})})}}bindListFilters(e){e.querySelectorAll(".admin-list__filter-select").forEach(t=>{t.addEventListener("change",()=>{this.applyListFilters()})})}applyListFilters(){if(!this.container)return;const e={};this.container.querySelectorAll(".admin-list__filter-select").forEach(s=>{const r=s.dataset.filter,n=s.value;if(!(!n||!r))if(r==="subject")e.subject=n;else if(r==="topic"){const o=k(n);o.length>0&&(e.topics=o)}else r==="educationalTier"?e.educationalTier=n:r==="difficulty"?e.difficulty=parseInt(n,10):r==="type"?e.type=n:r==="status"?e.status=n:r==="reviewStatus"&&(e.reviewStatus=n)});const i=this.manager.getRepository().filter(e);this.lastListCriteria=e,this.renderTableRows(i)}buildCoverageText(e){const t=I(e),i=t.subjectsWithoutContent.map(o=>f(o)).join(", "),s=i?` Subjects without content: ${this.esc(i)}.`:"";if(t.unmappedCount===0)return`Taxonomy coverage: all ${t.totalQuestions} questions map to a topic.${s}`;const r=t.unmappedQuestions.slice(0,5).map(o=>`${o.subject}/${o.topic}`).join(", "),n=t.unmappedCount>5?", …":"";return`Taxonomy coverage: ${t.unmappedCount} of ${t.totalQuestions} questions are unmapped (${this.esc(r)}${n}).${s}`}buildReviewSummaryText(e){const t=w(e),i=t.similarPromptPairs.length,s=i>0?` ${i} similar-prompt candidate(s) need review.`:"";return`Content review: ${t.questionsWithGaps} question(s) have ${t.gapCount} authoring gap(s).${s}`}handleEdit(e){var s,r,n;const t=this.manager.getRepository().getById(e);if(!t)return;const i=(s=this.container)==null?void 0:s.querySelector("#panel-add");i&&((r=this.container)==null||r.querySelectorAll(".admin__panel").forEach(o=>o.classList.remove("admin__panel--active")),i.classList.add("admin__panel--active"),(n=this.container)==null||n.querySelectorAll(".admin__nav-btn").forEach(o=>{o.classList.toggle("admin__nav-btn--active",o.dataset.panel==="add")}),this.renderForm(i,t))}handleDelete(e){const t=this.manager.getRepository().getById(e);t&&this.showConfirmDialog(`Are you sure you want to delete "${t.question.substring(0,50)}…"?`,async()=>{await this.manager.deleteQuestion(e),this.applyListFilters()})}showConfirmDialog(e,t,i={}){const s=i.confirmLabel??"Delete",r=i.danger===!1?"admin-form__btn--primary":"admin-form__btn--danger",n=i.messageHtml??this.esc(e),o=document.createElement("div");o.className="admin-confirm",o.innerHTML=`
      <div class="admin-confirm__card">
        <div class="admin-confirm__msg">${n}</div>
        <div class="admin-confirm__actions">
          <button class="admin-form__btn ${r}" id="confirm-yes">${this.esc(s)}</button>
          <button class="admin-form__btn admin-form__btn--secondary" id="confirm-no">Cancel</button>
        </div>
      </div>
    `,o.querySelector("#confirm-yes").addEventListener("click",()=>{o.remove(),t()}),o.querySelector("#confirm-no").addEventListener("click",()=>{o.remove()}),document.body.appendChild(o)}renderImportExport(e){const t=this.manager.getRepository().count();e.innerHTML=`
      <div class="admin-io__section">
        <h3 class="admin-io__title">📥 Import Questions</h3>
        <p class="admin-io__desc">Upload a versioned question bank export (format v${_}) or a legacy question array. The format version is checked first, every record is validated in a dry run, and a backup of the current bank is taken before anything is committed.</p>
        <div class="admin-io__file-input">
          <input type="file" accept=".json" id="import-file-input" />
        </div>
        <div class="admin-form__actions">
          <button class="admin-form__btn admin-form__btn--secondary" id="validate-import-btn">🔎 Validate (dry run)</button>
          <button class="admin-form__btn admin-form__btn--primary" id="import-btn">Import</button>
        </div>
        <div id="import-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">📤 Export Questions</h3>
        <p class="admin-io__desc">Download a versioned question bank file (format v${_}). Full exports preserve tombstone and bundled-override metadata; the file can be re-imported unchanged.</p>
        <p class="admin-io__desc" id="export-filter-note"></p>
        <div class="admin-form__actions">
          <button class="admin-form__btn admin-form__btn--primary" id="export-btn">Export All (${t})</button>
          <button class="admin-form__btn admin-form__btn--secondary" id="export-filtered-btn">Export Filtered Set</button>
        </div>
        <div id="export-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">🧾 Export Review Report</h3>
        <p class="admin-io__desc">Download a content-review report listing authoring gaps, similar-prompt candidates, and review-status counts. It changes no question.</p>
        <button class="admin-form__btn admin-form__btn--primary" id="review-report-btn">Export Review Report (JSON)</button>
        <div id="review-report-result"></div>
      </div>
      <div class="admin-io__section">
        <h3 class="admin-io__title">💾 Backup &amp; Restore</h3>
        <p class="admin-io__desc">Snapshot the bank before bulk changes. The most recent snapshot can be restored (this replaces the current bank).</p>
        <div class="admin-form__actions">
          <button class="admin-form__btn admin-form__btn--secondary" id="backup-btn">Download Backup</button>
          <button class="admin-form__btn admin-form__btn--secondary" id="restore-backup-btn" disabled>Restore Last Backup</button>
        </div>
        <div id="backup-result"></div>
      </div>
    `,this.updateExportFilterNote(),this.updateRestoreButton(),this.bindImportExportEvents(e)}bindImportExportEvents(e){var t,i,s,r,n,o,c;(t=e.querySelector("#validate-import-btn"))==null||t.addEventListener("click",()=>this.handleValidateImport()),(i=e.querySelector("#import-btn"))==null||i.addEventListener("click",()=>void this.handleImport()),(s=e.querySelector("#export-btn"))==null||s.addEventListener("click",()=>void this.handleExport(!1)),(r=e.querySelector("#export-filtered-btn"))==null||r.addEventListener("click",()=>void this.handleExport(!0)),(n=e.querySelector("#review-report-btn"))==null||n.addEventListener("click",()=>this.handleReviewReportExport()),(o=e.querySelector("#backup-btn"))==null||o.addEventListener("click",()=>this.handleBackup()),(c=e.querySelector("#restore-backup-btn"))==null||c.addEventListener("click",()=>this.handleRestoreBackup())}async readImportFile(){var i,s;const e=(i=this.container)==null?void 0:i.querySelector("#import-file-input"),t=(s=e==null?void 0:e.files)==null?void 0:s[0];if(!t)return{error:"Please select a JSON file."};try{return{text:await t.text()}}catch(r){return{error:r.message}}}renderImportReport(e){if(!e.ok)return`<div class="admin-io__result admin-io__result--error">❌ ${this.esc(e.message??"Import payload could not be read.")}</div>`;const t=e.formatVersion===0?"legacy file, no version envelope":`format v${e.formatVersion}`,i=e.records.filter(l=>l.errors.length>0),s=e.records.filter(l=>l.warnings.length>0),r=i.slice(0,10).map(l=>`• [${this.esc(l.questionId??`#${l.index}`)}] ${this.esc(l.errors.join(" "))}`).join("<br/>"),n=s.slice(0,10).map(l=>`• [${this.esc(l.questionId??`#${l.index}`)}] ${this.esc(l.warnings.join(" "))}`).join("<br/>"),o=[];e.overrideCount>0&&o.push(`${e.overrideCount} bundled override(s)`),e.tombstoneCount>0&&o.push(`${e.tombstoneCount} tombstone(s) will be preserved`);const c=e.canImport?"success":"error",d=e.canImport?`✅ ${e.validCount} of ${e.totalRecords} record(s) are importable (${t}).`:`❌ ${e.totalRecords} record(s) checked — ${e.invalidCount} invalid, ${e.duplicateIdCount} duplicate ID (${t}).`;return`
      <div class="admin-io__result admin-io__result--${c}">
        ${d}
        ${o.length>0?`<div class="admin-io__detail">${o.map(l=>this.esc(l)).join(" · ")}</div>`:""}
        ${r?`<div class="admin-io__detail">${r}</div>`:""}
        ${n?`<div class="admin-io__warnings">⚠ ${e.duplicatePromptWarnings} prompt warning(s) — candidates only:<br/>${n}</div>`:""}
      </div>
    `}handleValidateImport(){var t;const e=(t=this.container)==null?void 0:t.querySelector("#import-result");e&&this.readImportFile().then(({text:i,error:s})=>{if(s!==void 0||i===void 0){e.innerHTML=`<div class="admin-io__result admin-io__result--error">${this.esc(s??"Could not read file.")}</div>`;return}e.innerHTML=this.renderImportReport(this.manager.previewBankImport(i))})}async handleImport(){var c;const e=(c=this.container)==null?void 0:c.querySelector("#import-result");if(!e)return;const{text:t,error:i}=await this.readImportFile();if(i!==void 0||t===void 0){e.innerHTML=`<div class="admin-io__result admin-io__result--error">${this.esc(i??"Could not read file.")}</div>`;return}const s=this.manager.previewBankImport(t);if(!s.canImport){e.innerHTML=this.renderImportReport(s);return}const r=this.manager.getRepository().count(),n=[];s.overrideCount>0&&n.push(`${s.overrideCount} record(s) will replace bundled question(s).`),s.tombstoneCount>0&&n.push(`${s.tombstoneCount} tombstone(s) will be preserved.`);const o=`Import ${s.validCount} question(s)? A backup of the current ${r} question(s) will be taken first.`+(n.length>0?` ${n.join(" ")}`:"")+(s.duplicatePromptWarnings>0?` ${s.duplicatePromptWarnings} prompt warning(s) were flagged as candidates for review.`:"");this.showConfirmDialog(o,async()=>{this.lastBackup=this.manager.createBackup();const d=await this.manager.importBankFromJson(t);if(d.success){const l=[];d.overrideCount>0&&l.push(`${d.overrideCount} bundled override(s)`),d.tombstoneCount>0&&l.push(`${d.tombstoneCount} tombstone(s) applied`),e.innerHTML=`<div class="admin-io__result admin-io__result--success">✅ Imported ${d.importedCount} questions successfully${l.length>0?` (${l.join(", ")})`:""}.</div>`}else e.innerHTML=`<div class="admin-io__result admin-io__result--error">❌ Import failed: ${this.esc(d.errors.map(l=>l.message).join(" "))}</div>`;this.updateRestoreButton()},{confirmLabel:"Import",danger:!1})}handleBackup(){var i;const e=(i=this.container)==null?void 0:i.querySelector("#backup-result"),t=this.manager.createBackup();this.lastBackup=t,this.downloadJson(t.json,`knowledge-realms-backup-${new Date().toISOString().slice(0,10)}.json`),e&&(e.innerHTML=`<div class="admin-io__result admin-io__result--success">✅ Backup created (${t.questionCount} questions).</div>`),this.updateRestoreButton()}handleRestoreBackup(){var i;const e=(i=this.container)==null?void 0:i.querySelector("#backup-result"),t=this.lastBackup;t&&this.showConfirmDialog(`Restore the backup taken ${t.createdAt}? This replaces the current ${this.manager.getRepository().count()} question(s) with ${t.questionCount}.`,async()=>{const s=this.manager.createBackup(),r=await this.manager.restoreBackup(t.json);r.success&&(this.lastBackup=s,this.updateRestoreButton()),e&&(e.innerHTML=r.success?`<div class="admin-io__result admin-io__result--success">✅ Restored ${r.restoredCount} questions. The previous ${s.questionCount} question(s) were backed up first; use Restore to revert.</div>`:`<div class="admin-io__result admin-io__result--error">❌ Restore failed: ${this.esc(r.errors.map(n=>n.message).join(" "))}</div>`)},{confirmLabel:"Restore",danger:!0})}updateRestoreButton(){var t;const e=(t=this.container)==null?void 0:t.querySelector("#restore-backup-btn");e&&(e.disabled=!this.lastBackup)}async handleExport(e){var i;const t=(i=this.container)==null?void 0:i.querySelector("#export-result");try{const s=e&&Object.keys(this.lastListCriteria).length>0?this.lastListCriteria:void 0,r=await this.manager.exportBankToJson(s,{appVersion:R}),n=s?this.manager.getRepository().filter(s).length:this.manager.getRepository().count();this.downloadJson(r,`knowledge-realms-question-bank-${e?"filtered-":""}${new Date().toISOString().slice(0,10)}.json`),t&&(t.innerHTML=`<div class="admin-io__result admin-io__result--success">✅ Exported ${n} question(s) as format v${_}${s?" (filtered set; tombstones omitted)":""}.</div>`)}catch(s){t&&(t.innerHTML=`<div class="admin-io__result admin-io__result--error">Error: ${this.esc(s.message)}</div>`)}}handleReviewReportExport(){var t;const e=(t=this.container)==null?void 0:t.querySelector("#review-report-result");try{const i=w(this.manager.getRepository().getAll());this.downloadJson(M(i),`knowledge-realms-review-report-${new Date().toISOString().slice(0,10)}.json`),e&&(e.innerHTML=`<div class="admin-io__result admin-io__result--success">✅ Review report exported (${i.gapCount} gap(s), ${i.similarPromptPairs.length} candidate pair(s)).</div>`)}catch(i){e&&(e.innerHTML=`<div class="admin-io__result admin-io__result--error">Error: ${this.esc(i.message)}</div>`)}}describeCriteria(e){const t=[];return e.subject&&t.push(`subject=${e.subject}`),e.topics&&e.topics.length>0&&t.push(`topic=${e.topics.join("|")}`),e.educationalTier&&t.push(`tier=${e.educationalTier}`),e.difficulty!==void 0&&t.push(`difficulty=${e.difficulty}`),e.type&&t.push(`type=${e.type}`),e.status&&t.push(`status=${e.status}`),e.reviewStatus&&t.push(`review=${e.reviewStatus}`),t.join(", ")}updateExportFilterNote(){var i;const e=(i=this.container)==null?void 0:i.querySelector("#export-filter-note");if(!e)return;const t=this.describeCriteria(this.lastListCriteria);e.textContent=t?`Filtered export uses the current list filters: ${t}. Tombstones are only included in full exports.`:"Filtered export uses the current list filters. None are applied, so it falls back to all questions. Tombstones are only included in full exports."}downloadJson(e,t){const i=new Blob([e],{type:"application/json"}),s=URL.createObjectURL(i),r=document.createElement("a");r.href=s,r.download=t,r.click(),URL.revokeObjectURL(s)}esc(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}export{q as AdminDashboard};
