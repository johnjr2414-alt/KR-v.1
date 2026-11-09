var b=Object.defineProperty;var _=(n,t,e)=>t in n?b(n,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[t]=e;var r=(n,t,e)=>_(n,typeof t!="symbol"?t+"":t,e);import{f as l}from"./index-CAsaZBIi.js";var c=(n=>(n.Correct="correct",n.Incorrect="incorrect",n.Timeout="timeout",n))(c||{}),v=(n=>(n.Victory="victory",n.Defeat="defeat",n))(v||{});function u(n){return n.toLowerCase().trim().replace(/\s+/g," ").replace(/[.,!?]+$/,"").trim()}class p{static evaluate(t,e,i=!1){const s=t.explanation;if(i)return{outcome:c.Timeout,isCorrect:!1,correctAnswerText:this.getCanonicalAnswerText(t),explanation:s,submittedAnswer:""};if(t.type===l.MultipleChoice)return this.evaluateMultipleChoice(t,e);if(t.type===l.Identification)return this.evaluateIdentification(t,e);const o=t.expectedAnswer||t.correctAnswer||"",a=u(e)===u(o);return{outcome:a?c.Correct:c.Incorrect,isCorrect:a,correctAnswerText:o,explanation:s,submittedAnswer:e}}static evaluateMultipleChoice(t,e){const i=e.trim(),s=(t.correctAnswer||"").trim(),o=i.length>0&&i.toLowerCase()===s.toLowerCase();return{outcome:o?c.Correct:c.Incorrect,isCorrect:o,correctAnswerText:this.getCanonicalAnswerText(t),explanation:t.explanation,submittedAnswer:e}}static evaluateIdentification(t,e){const i=u(e),s=[];if(t.correctAnswer&&t.correctAnswer.trim()!==""&&s.push(u(t.correctAnswer)),Array.isArray(t.acceptedAnswers))for(const a of t.acceptedAnswers)typeof a=="string"&&a.trim()!==""&&s.push(u(a));const o=i.length>0&&s.includes(i);return{outcome:o?c.Correct:c.Incorrect,isCorrect:o,correctAnswerText:this.getCanonicalAnswerText(t),explanation:t.explanation,submittedAnswer:e}}static getCanonicalAnswerText(t){if(t.type===l.MultipleChoice&&t.choices){const e=t.choices.find(i=>i.choiceId.toLowerCase()===(t.correctAnswer||"").toLowerCase());if(e)return`${e.choiceId.toUpperCase()}: ${e.text}`}return t.correctAnswer||t.expectedAnswer||"N/A"}}class q{constructor(t){r(this,"durationMs");r(this,"remainingMs");r(this,"intervalMs");r(this,"timerHandle",null);r(this,"hasTimedOut",!1);r(this,"isRunning",!1);r(this,"onTick");r(this,"onTimeout");this.durationMs=Math.max(1,t.durationSeconds)*1e3,this.remainingMs=this.durationMs,this.intervalMs=t.intervalMs??100,this.onTick=t.onTick,this.onTimeout=t.onTimeout}start(){this.isRunning||this.hasTimedOut||(this.isRunning=!0,this.emitTick(),this.timerHandle=setInterval(()=>{this.remainingMs=Math.max(0,this.remainingMs-this.intervalMs),this.emitTick(),this.remainingMs<=0&&(this.stop(),this.triggerTimeout())},this.intervalMs))}stop(){this.timerHandle!==null&&(clearInterval(this.timerHandle),this.timerHandle=null),this.isRunning=!1}reset(t){this.stop(),t!==void 0&&(this.durationMs=Math.max(1,t)*1e3),this.remainingMs=this.durationMs,this.hasTimedOut=!1,this.emitTick()}getSecondsRemaining(){return Math.ceil(this.remainingMs/1e3)}getProgress(){return this.durationMs<=0?0:Math.max(0,Math.min(1,this.remainingMs/this.durationMs))}emitTick(){this.onTick&&this.onTick(this.getSecondsRemaining(),this.getProgress())}triggerTimeout(){this.hasTimedOut||(this.hasTimedOut=!0,this.onTimeout&&this.onTimeout())}}class C{constructor(t){r(this,"container",null);r(this,"options");r(this,"timer",null);r(this,"closeTimer",null);r(this,"isSubmitted",!1);r(this,"evaluationResult",null);this.options=t}getEvaluationResult(){return this.evaluationResult}show(){this.destroy();const t=this.options.question,e=document.createElement("div");e.className="question-modal",e.id="question-modal",e.innerHTML=`
      <div class="question-modal__card">
        <div class="question-modal__header">
          <div class="question-modal__meta">
            <span class="question-modal__badge">${this.escape(t.subject)}</span>
            <span class="question-modal__badge">${this.escape(t.educationalTier)}</span>
            <span class="question-modal__badge">Diff: ${t.difficulty}</span>
          </div>
          <div class="question-modal__timer-wrapper">
            <span class="question-modal__timer-text" id="qm-timer-text">${t.timeLimit}s</span>
          </div>
        </div>
        <div class="question-modal__timer-bar-bg">
          <div class="question-modal__timer-bar" id="qm-timer-bar"></div>
        </div>

        <div class="question-modal__body">
          <div class="question-modal__stem">${this.escape(t.question)}</div>

          <div id="qm-interactive-area">
            ${this.renderInputArea(t)}
          </div>

          <div class="question-modal__feedback" id="qm-feedback"></div>
        </div>

        <div class="question-modal__footer" id="qm-footer" style="display: none;">
          <button class="question-modal__next-btn" id="qm-continue-btn">Continue</button>
        </div>
      </div>
    `,document.body.appendChild(e),this.container=e,this.bindEvents(),this.startTimer(t.timeLimit)}destroy(){this.timer&&(this.timer.stop(),this.timer=null),this.closeTimer!==null&&(clearTimeout(this.closeTimer),this.closeTimer=null),this.container&&(this.container.remove(),this.container=null)}renderInputArea(t){return t.type===l.MultipleChoice&&t.choices?`<div class="question-modal__choices">${t.choices.map(i=>`
          <button class="question-modal__choice-btn" data-choice-id="${this.escape(i.choiceId)}">
            <span class="question-modal__choice-id">${this.escape(i.choiceId.toUpperCase())}</span>
            <span class="question-modal__choice-text">${this.escape(i.text)}</span>
          </button>
        `).join("")}</div>`:t.type===l.Identification?`
        <form class="question-modal__id-form" id="qm-id-form">
          <input
            type="text"
            class="question-modal__id-input"
            id="qm-id-input"
            placeholder="Type your answer here..."
            autocomplete="off"
            autofocus
          />
          <button type="submit" class="question-modal__submit-btn" id="qm-submit-btn">Submit</button>
        </form>
      `:`
      <form class="question-modal__id-form" id="qm-id-form">
        <input
          type="text"
          class="question-modal__id-input"
          id="qm-id-input"
          placeholder="Answer..."
          autocomplete="off"
        />
        <button type="submit" class="question-modal__submit-btn" id="qm-submit-btn">Submit</button>
      </form>
    `}bindEvents(){if(!this.container)return;if(this.options.question.type===l.MultipleChoice)this.container.querySelectorAll(".question-modal__choice-btn").forEach(s=>{s.addEventListener("click",()=>{const o=s.dataset.choiceId;o&&this.handleAnswerSubmission(o)})});else{const i=this.container.querySelector("#qm-id-form"),s=this.container.querySelector("#qm-id-input");i==null||i.addEventListener("submit",o=>{o.preventDefault();const a=(s==null?void 0:s.value)||"";this.handleAnswerSubmission(a)})}const e=this.container.querySelector("#qm-continue-btn");e==null||e.addEventListener("click",()=>{var i,s;this.destroy(),(s=(i=this.options).onClose)==null||s.call(i)})}startTimer(t){var s,o;const e=(s=this.container)==null?void 0:s.querySelector("#qm-timer-text"),i=(o=this.container)==null?void 0:o.querySelector("#qm-timer-bar");this.timer=new q({durationSeconds:t,onTick:(a,d)=>{e&&(e.textContent=`${a}s`),i&&(i.style.width=`${d*100}%`,d<=.25?i.className="question-modal__timer-bar question-modal__timer-bar--danger":d<=.5?i.className="question-modal__timer-bar question-modal__timer-bar--warning":i.className="question-modal__timer-bar")},onTimeout:()=>{this.handleTimeout()}}),this.timer.start()}handleAnswerSubmission(t){var i,s,o;if(this.isSubmitted)return;this.isSubmitted=!0,(i=this.timer)==null||i.stop(),this.disableInputs();const e=p.evaluate(this.options.question,t,!1);this.evaluationResult=e,this.displayFeedback(e,t),(o=(s=this.options).onAnswer)==null||o.call(s,e),this.handlePostFeedback()}handleTimeout(){var e,i;if(this.isSubmitted)return;this.isSubmitted=!0,this.disableInputs();const t=p.evaluate(this.options.question,"",!0);this.evaluationResult=t,this.displayFeedback(t),(i=(e=this.options).onAnswer)==null||i.call(e,t),this.handlePostFeedback()}disableInputs(){if(!this.container)return;this.container.querySelectorAll(".question-modal__choice-btn").forEach(s=>s.disabled=!0);const e=this.container.querySelector("#qm-id-input");e&&(e.disabled=!0);const i=this.container.querySelector("#qm-submit-btn");i&&(i.disabled=!0)}displayFeedback(t,e){if(!this.container)return;if(this.options.question.type===l.MultipleChoice){const d=this.container.querySelectorAll(".question-modal__choice-btn"),f=(this.options.question.correctAnswer||"").toLowerCase();d.forEach(m=>{const h=(m.dataset.choiceId||"").toLowerCase();h===f?m.classList.add("question-modal__choice-btn--correct"):e&&h===e.toLowerCase()&&m.classList.add("question-modal__choice-btn--incorrect")})}const i=this.container.querySelector("#qm-feedback");if(!i)return;i.style.display="block";let s="",o="";t.outcome===c.Correct?(s="✓ Correct!",o="question-modal__feedback--correct"):t.outcome===c.Timeout?(s="⏱ Time Up!",o="question-modal__feedback--timeout"):(s="✗ Incorrect",o="question-modal__feedback--incorrect"),i.className=`question-modal__feedback ${o}`;let a=`<div class="question-modal__feedback-title">${s}</div>`;t.outcome!==c.Correct&&(a+=`<div>Correct answer: <strong>${this.escape(t.correctAnswerText)}</strong></div>`),t.explanation&&(a+=`<div class="question-modal__feedback-explanation">${this.escape(t.explanation)}</div>`),i.innerHTML=a}handlePostFeedback(){var t;if(this.options.autoCloseDelayMs!==void 0&&this.options.autoCloseDelayMs>0)this.closeTimer=window.setTimeout(()=>{var e,i;this.closeTimer=null,this.destroy(),(i=(e=this.options).onClose)==null||i.call(e)},this.options.autoCloseDelayMs);else{const e=(t=this.container)==null?void 0:t.querySelector("#qm-footer");e&&(e.style.display="flex")}}escape(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}export{c as A,v as B,C as Q};
