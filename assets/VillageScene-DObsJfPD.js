var X=Object.defineProperty;var ee=(u,t,e)=>t in u?X(u,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):u[t]=e;var c=(u,t,e)=>ee(u,typeof t!="symbol"?t+"":t,e);import{P as te}from"./phaser-B61OQUcB.js";import{Z as $,B as se,I as ie,P as ae,E as ne,c as re,e as oe,g as ce,a as le,i as de,H as j,b as he,D as ue}from"./InteractionGuard-D7yxEt9d.js";import{q as pe,U as E,g as ve,c as be,i as me,a as S,p as h,B,S as f,E as m,s as U,b as fe,A as ge,d as A,e as ye,P as _e,D as ke,Q as k,f as w,h as we}from"./index-CAsaZBIi.js";import{Q as V,A as W}from"./QuestionModal-B4evBrqw.js";import"./PassiveSkillCalculator-avMcAEQh.js";const $e=5;function Ie(u,t,e,s){const a=t-u;let i;a<=0?i=$.Safe:a<=4?i=$.Caution:a<=9?i=$.Danger:i=$.Extreme;const n=a>=$e;let o="";return n&&(o=`⚠ Warning: ${e} is designed for Level ${s}+.
Your character is Level ${u}.
Monsters here will be much stronger and questions will be significantly harder.
Proceed at your own risk.`),{isDangerous:n,dangerLevel:i,playerLevel:u,averageMonsterLevel:t,delta:a,warningMessage:o}}const xe={[$.Safe]:"#22c55e",[$.Caution]:"#f59e0b",[$.Danger]:"#ef4444",[$.Extreme]:"#9333ea"};class Me{constructor(){c(this,"container",null)}show(t,e,s){var o,r;this.destroy();const a=xe[t.dangerLevel],i=t.dangerLevel.toUpperCase().replace("-"," "),n=document.createElement("div");n.id="zone-warning-modal",n.innerHTML=`
      <div class="zone-warning__backdrop">
        <div class="zone-warning__card">
          <div class="zone-warning__header" style="border-color: ${a}">
            <span class="zone-warning__icon">⚠️</span>
            <h2 class="zone-warning__title">Entering Dangerous Zone</h2>
          </div>
          <div class="zone-warning__zone-name">${e}</div>
          <div class="zone-warning__danger-badge" style="background: ${a}22; border-color: ${a}; color: ${a}">
            ${i}
          </div>
          <div class="zone-warning__stats">
            <div class="zone-warning__stat">
              <span class="zone-warning__stat-label">Your Level</span>
              <span class="zone-warning__stat-value">${t.playerLevel}</span>
            </div>
            <div class="zone-warning__stat">
              <span class="zone-warning__stat-label">Monster Level</span>
              <span class="zone-warning__stat-value" style="color: ${a}">~${t.averageMonsterLevel}</span>
            </div>
          </div>
          <p class="zone-warning__message">
            Monsters here are <strong style="color: ${a}">${t.delta} levels above you</strong>.
            Questions will be significantly harder and your character may be defeated quickly.
            You may still enter — proceed at your own risk.
          </p>
          <div class="zone-warning__buttons">
            <button class="zone-warning__btn zone-warning__btn--cancel" id="zone-warning-cancel">
              ← Go Back
            </button>
            <button class="zone-warning__btn zone-warning__btn--confirm" id="zone-warning-confirm" style="border-color: ${a}; color: ${a}">
              Enter Anyway
            </button>
          </div>
        </div>
      </div>
    `,(o=document.getElementById("zone-warning-cancel"))==null||o.addEventListener("click",()=>{this.destroy(),s(!1)}),(r=n.querySelector("#zone-warning-confirm"))==null||r.addEventListener("click",()=>{this.destroy(),s(!0)}),document.body.appendChild(n),this.container=n}destroy(){this.container&&(this.container.remove(),this.container=null)}}function Se(u,t,e=1){const{status:s,questId:a}=t.resolveNpcQuest(u.id,e);let i;s==="ready-turn-in"?i=u.dialogue.questCompleted:s==="in-progress"?i=u.dialogue.questInProgress:s==="available"&&(i=u.dialogue.questAvailable);const n=i&&i.length>0?i:u.dialogue.default;return{state:s,questId:a,speaker:u.name,lines:n.map(o=>({text:o,speaker:u.name}))}}class Ce{constructor(t){c(this,"container",null);c(this,"npc");c(this,"qm");c(this,"playerLevel");c(this,"onClose");c(this,"onQuestUpdate");c(this,"onOpenCareer");this.npc=t.npc,this.qm=t.questManager||pe,this.playerLevel=t.playerLevel??1,this.onClose=t.onClose,this.onQuestUpdate=t.onQuestUpdate,this.onOpenCareer=t.onOpenCareer}show(){var b;this.destroy();const t=document.createElement("div");t.className="npc-dialogue-modal",t.id="npc-dialogue-modal";const e=Se(this.npc,this.qm,this.playerLevel),s=e.state,a=e.questId,i=a?ve(a):void 0,n=a?this.qm.getQuestRecord(a):void 0,o=e.lines.map(p=>`<p>${this.escape(p.text)}</p>`).join("");let r="";if(i&&(s==="available"||s==="in-progress"||s==="ready-turn-in")){const p=n?n.objectives.map(y=>`• ${this.escape(y.description)}: ${y.currentCount}/${y.requiredCount}`).join("<br>"):i.objectives.map(y=>`• ${this.escape(y.description)}: 0/${y.requiredCount}`).join("<br>"),g=`Rewards: ${i.rewards.combatExp} Combat EXP, ${i.rewards.gold} Gold${i.rewards.items?", "+i.rewards.items.map(y=>`${y.quantity}x ${y.itemId}`).join(", "):""}`;r=`
        <div class="quest-box">
          <div class="quest-box__name">📜 ${this.escape(i.name)}</div>
          <div class="quest-box__desc">${this.escape(i.description)}</div>
          <div class="quest-box__objectives">${p}</div>
          <div class="quest-box__rewards">🎁 ${this.escape(g)}</div>
        </div>
      `}t.innerHTML=`
      <div class="npc-dialogue-card">
        <div class="npc-dialogue-header">
          <div class="npc-dialogue-header__title">
            👤 ${this.escape(this.npc.name)}
            ${this.npc.title?`<span class="npc-title">(${this.escape(this.npc.title)})</span>`:""}
          </div>
          <button class="npc-dialogue-header__close" id="npc-close-btn">&times;</button>
        </div>
        <div class="npc-dialogue-body">
          ${o}
          ${r}
        </div>
        <div class="npc-dialogue-footer" id="npc-footer-actions"></div>
      </div>
    `,document.body.appendChild(t),this.container=t;const l=t.querySelector("#npc-footer-actions");if(l&&i){if(s==="available"){const p=document.createElement("button");p.className="npc-btn npc-btn--primary",p.textContent=E.npcDialogue.acceptQuest,p.addEventListener("click",()=>{var g;this.qm.acceptQuest(i.id,this.playerLevel),(g=this.onQuestUpdate)==null||g.call(this),this.show()}),l.appendChild(p)}else if(s==="ready-turn-in"){const p=document.createElement("button");p.className="npc-btn npc-btn--success",p.textContent=E.npcDialogue.completeQuest,p.addEventListener("click",()=>{var g;this.qm.completeQuest(i.id),(g=this.onQuestUpdate)==null||g.call(this),this.show()}),l.appendChild(p)}}const d=document.createElement("button");if(d.className="npc-btn npc-btn--secondary",d.textContent=E.common.close,d.addEventListener("click",()=>{var p;this.destroy(),(p=this.onClose)==null||p.call(this)}),l==null||l.appendChild(d),l&&this.onOpenCareer){const p=document.createElement("button");p.className="npc-btn npc-btn--career",p.textContent=E.npcDialogue.careerCenter,p.addEventListener("click",()=>{var g;return(g=this.onOpenCareer)==null?void 0:g.call(this)}),l.appendChild(p)}(b=t.querySelector("#npc-close-btn"))==null||b.addEventListener("click",()=>{var p;this.destroy(),(p=this.onClose)==null||p.call(this)})}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}class Ee{constructor(t=be,e=me){c(this,"currency");c(this,"inventory");this.currency=t,this.inventory=e}buyItem(t,e,s=1){const a=Math.floor(s);if(a<=0)return{success:!1,itemId:e,quantity:0,totalCost:0,error:"Invalid quantity"};const i=t.catalog.find(r=>r.itemId===e);if(!i)return{success:!1,itemId:e,quantity:a,totalCost:0,error:"Item not in stock"};if(i.stock!==void 0&&i.stock<a)return{success:!1,itemId:e,quantity:a,totalCost:0,error:"Insufficient store inventory"};const n=i.buyPrice*a;if(!this.currency.hasGold(n))return{success:!1,itemId:e,quantity:a,totalCost:n,error:`Insufficient gold. Needed: ${n}, have: ${this.currency.getGold()}`};const o=this.inventory.addItem(e,a);return!o.success||o.remainingQuantity>0?(o.addedQuantity>0&&this.inventory.removeItem(e,o.addedQuantity),{success:!1,itemId:e,quantity:a,totalCost:n,error:"Inventory is full"}):(this.currency.spendGold(n),i.stock!==void 0&&(i.stock-=a),{success:!0,itemId:e,quantity:a,totalCost:n})}sellItem(t,e,s=1){const a=Math.floor(s);if(a<=0)return{success:!1,itemId:e,quantity:0,totalCost:0,error:"Invalid quantity"};const i=S(e);if(!i)return{success:!1,itemId:e,quantity:a,totalCost:0,error:"Unknown item"};const o=Math.max(1,Math.floor(i.value*t.sellPriceMultiplier))*a;return this.inventory.removeItem(e,a)?(this.currency.addGold(o),{success:!0,itemId:e,quantity:a,totalCost:o}):{success:!1,itemId:e,quantity:a,totalCost:0,error:"You do not have enough of this item to sell"}}}const Ae=new Ee;class Te{constructor(t){c(this,"container",null);c(this,"shop");c(this,"service");c(this,"onClose");c(this,"onTransactionComplete");c(this,"activeTab","buy");c(this,"feedbackMessage","");c(this,"feedbackIsError",!1);c(this,"isProcessing",!1);this.shop=t.shop,this.service=t.shopService||Ae,this.onClose=t.onClose,this.onTransactionComplete=t.onTransactionComplete}show(){this.destroy();const t=document.createElement("div");t.className="shop-modal",t.id="shop-modal",document.body.appendChild(t),this.container=t,this.render()}render(){var e,s,a;if(!this.container)return;const t=h.currency.getGold();this.container.innerHTML=`
      <div class="shop-card">
        <div class="shop-card__header">
          <div class="shop-card__title-area">
            <span class="shop-card__title">🏪 ${this.escape(this.shop.name)}</span>
            <span class="shop-card__merchant">${this.escape(this.shop.merchantNpcId??"Merchant")}</span>
          </div>
          <div class="shop-card__header-gold">
            🪙 ${t} G
          </div>
        </div>

        <div class="shop-card__tabs">
          <button class="shop-card__tab ${this.activeTab==="buy"?"shop-card__tab--active":""}" id="shop-tab-buy" type="button">
            Buy Goods
          </button>
          <button class="shop-card__tab ${this.activeTab==="sell"?"shop-card__tab--active":""}" id="shop-tab-sell" type="button">
            Sell Spoils
          </button>
        </div>

        <div class="shop-card__content" id="shop-content">
          ${this.activeTab==="buy"?this.renderBuyCatalog(t):this.renderSellInventory()}
        </div>

        <div class="shop-card__footer">
          <div class="shop-card__feedback ${this.feedbackIsError?"shop-card__feedback--error":"shop-card__feedback--success"}">
            ${this.escape(this.feedbackMessage)}
          </div>
          <button class="shop-card__close-btn" id="shop-close-btn" type="button">
            Done
          </button>
        </div>
      </div>
    `,(e=this.container.querySelector("#shop-tab-buy"))==null||e.addEventListener("click",()=>{this.activeTab="buy",this.feedbackMessage="",this.render()}),(s=this.container.querySelector("#shop-tab-sell"))==null||s.addEventListener("click",()=>{this.activeTab="sell",this.feedbackMessage="",this.render()}),(a=this.container.querySelector("#shop-close-btn"))==null||a.addEventListener("click",()=>{var i;this.destroy(),(i=this.onClose)==null||i.call(this)}),this.activeTab==="buy"?this.attachBuyListeners():this.attachSellListeners()}renderBuyCatalog(t){return this.shop.catalog.length===0?'<div class="shop-card__empty">No items currently available.</div>':this.shop.catalog.map(e=>{const s=S(e.itemId),a=(s==null?void 0:s.name)??e.itemId,i=(s==null?void 0:s.description)??"",n=t>=e.buyPrice;return`
          <div class="shop-item-row">
            <div class="shop-item-row__info">
              <span class="shop-item-row__name">${this.escape(a)}</span>
              <span class="shop-item-row__desc">${this.escape(i)}</span>
            </div>
            <div class="shop-item-row__price">
              ${e.buyPrice} G
            </div>
            <div class="shop-item-row__action">
              <button class="shop-action-btn" data-buy-item="${e.itemId}" ${n?"":"disabled"}>
                Buy (1)
              </button>
            </div>
          </div>
        `}).join("")}renderSellInventory(){const t=h.inventory.getState(),e=new Set(Object.values(t.equipped)),s=new Map;for(const i of t.slots)i&&s.set(i.itemId,(s.get(i.itemId)??0)+i.quantity);if(s.size===0)return'<div class="shop-card__empty">Your bag is empty.</div>';let a="";for(const[i,n]of s.entries()){if(e.has(i))continue;const r=S(i),l=(r==null?void 0:r.name)??i,d=(r==null?void 0:r.description)??"",b=(r==null?void 0:r.value)??0,p=Math.max(1,Math.floor(b*this.shop.sellPriceMultiplier));a+=`
        <div class="shop-item-row">
          <div class="shop-item-row__info">
            <span class="shop-item-row__name">${this.escape(l)} × ${n}</span>
            <span class="shop-item-row__desc">${this.escape(d)}</span>
          </div>
          <div class="shop-item-row__price">
            ${p} G ea.
          </div>
          <div class="shop-item-row__action">
            <button class="shop-action-btn shop-action-btn--sell" data-sell-item="${i}">
              Sell (1)
            </button>
          </div>
        </div>
      `}return a}attachBuyListeners(){if(!this.container)return;this.container.querySelectorAll("[data-buy-item]").forEach(e=>{e.addEventListener("click",()=>{const s=e.getAttribute("data-buy-item");s&&this.handleBuy(s)})})}attachSellListeners(){if(!this.container)return;this.container.querySelectorAll("[data-sell-item]").forEach(e=>{e.addEventListener("click",()=>{const s=e.getAttribute("data-sell-item");s&&this.handleSell(s)})})}handleBuy(t){var s,a;if(this.isProcessing)return;this.isProcessing=!0;const e=this.service.buyItem(this.shop,t,1);e.success?(this.feedbackMessage=`Purchased 1x ${((s=S(t))==null?void 0:s.name)??t} for ${e.totalCost} G!`,this.feedbackIsError=!1,h.saveSession(),(a=this.onTransactionComplete)==null||a.call(this)):(this.feedbackMessage=e.error??"Purchase failed",this.feedbackIsError=!0),this.isProcessing=!1,this.render()}handleSell(t){var s,a;if(this.isProcessing)return;this.isProcessing=!0;const e=this.service.sellItem(this.shop,t,1);e.success?(this.feedbackMessage=`Sold 1x ${((s=S(t))==null?void 0:s.name)??t} for ${e.totalCost} G!`,this.feedbackIsError=!1,h.saveSession(),(a=this.onTransactionComplete)==null||a.call(this)):(this.feedbackMessage=e.error??"Sale failed",this.feedbackIsError=!0),this.isProcessing=!1,this.render()}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}const G=[{id:"invest-apothecary",name:"Apothecary Herb Expedition",description:"Finance an expedition to harvest rare medicinal herbs in the math groves.",cost:50,expectedReturnRate:.2,durationMs:45e3},{id:"invest-caravan",name:"Regional Trade Caravan",description:"Underwrite trade carts transporting books and parchment between villages.",cost:150,expectedReturnRate:.35,durationMs:12e4},{id:"invest-mine",name:"Crystal Deep Shaft Prospecting",description:"High-risk deep mining excavation into logic gemstone veins.",cost:300,expectedReturnRate:.5,durationMs:3e5}],Pe=[{id:"biz-village-tea",name:"Village Herbal Tea Stall",type:B.Apothecary,ownerId:"player-1",level:1,employees:1,dailyRevenue:40,dailyExpenses:15,productionItemIds:["minor-health-potion"]},{id:"biz-bookbindery",name:"Scholar Bookbindery",type:B.Library,ownerId:"player-1",level:1,employees:2,dailyRevenue:90,dailyExpenses:35,productionItemIds:["scroll-of-wisdom"]}];class qe{constructor(t={}){c(this,"container",null);c(this,"bank");c(this,"currency");c(this,"onClose");c(this,"onTransactionComplete");c(this,"activeTab","savings");c(this,"feedbackMessage","");c(this,"feedbackIsError",!1);if(this.bank=t.bankService||h.bank,this.currency=t.currencyService||h.currency,this.onClose=t.onClose,this.onTransactionComplete=t.onTransactionComplete,this.bank.getAllBusinesses().length===0)for(const e of Pe)this.bank.registerBusiness(e)}show(){var s;this.destroy();const t=this.bank.applyInterest();t>0&&(this.feedbackMessage=`Accrued ${t} Gold in compound savings interest!`,this.feedbackIsError=!1,(s=this.onTransactionComplete)==null||s.call(this));const e=document.createElement("div");e.className="bank-modal",e.id="bank-modal",document.body.appendChild(e),this.container=e,this.render()}render(){if(!this.container)return;const t=this.currency.getGold(),e=this.bank.getSavingsBalance(),s=this.bank.getConfig(),a=`
      <div class="bank-tabs">
        <button class="bank-tab ${this.activeTab==="savings"?"bank-tab--active":""}" data-tab="savings">
          🏦 Savings & Vault
        </button>
        <button class="bank-tab ${this.activeTab==="investments"?"bank-tab--active":""}" data-tab="investments">
          📈 Venture Investments
        </button>
        <button class="bank-tab ${this.activeTab==="business"?"bank-tab--active":""}" data-tab="business">
          🏪 Commercial Enterprises
        </button>
      </div>
    `,i=this.feedbackMessage?`<div class="bank-feedback ${this.feedbackIsError?"bank-feedback--error":"bank-feedback--success"}">
          ${this.escape(this.feedbackMessage)}
         </div>`:"";let n="";this.activeTab==="savings"?n=this.renderSavingsTab(t,e,s.interestRatePerInterval):this.activeTab==="investments"?n=this.renderInvestmentsTab():n=this.renderBusinessTab(),this.container.innerHTML=`
      <div class="bank-card">
        <div class="bank-card__header">
          <div class="bank-card__title-area">
            <div class="bank-card__title">🏛️ Beginners Village Bank & Treasury</div>
            <div class="bank-card__subtitle">Secure Vault, Savings Interest & Municipal Investments</div>
          </div>
          <button class="bank-card__close" id="bank-close-btn">&times;</button>
        </div>
        ${a}
        <div class="bank-content">
          <div class="bank-summary-grid">
            <div class="bank-summary-box">
              <span class="bank-summary-box__label">Carried Purse Gold</span>
              <span class="bank-summary-box__val bank-summary-box__val--gold">🪙 ${t.toLocaleString()} G</span>
            </div>
            <div class="bank-summary-box">
              <span class="bank-summary-box__label">Bank Savings Balance</span>
              <span class="bank-summary-box__val bank-summary-box__val--gold">🏦 ${e.toLocaleString()} G</span>
            </div>
          </div>
          ${i}
          ${n}
        </div>
        <div class="bank-card__footer">
          <span>Max Savings Vault: ${s.maxSavingsLimit.toLocaleString()} G</span>
          <span>Interest Rate: ${(s.interestRatePerInterval*100).toFixed(0)}% per interval</span>
        </div>
      </div>
    `,this.bindEvents()}renderSavingsTab(t,e,s){return`
      <div class="bank-action-panel">
        <div class="bank-action-panel__title">📥 Deposit Gold into Savings</div>
        <div class="bank-input-row">
          <input type="number" id="bank-deposit-input" class="bank-input" placeholder="Amount to deposit" min="1" max="${t}" />
          <button class="bank-btn bank-btn--primary" id="bank-deposit-btn">Deposit</button>
        </div>
        <div class="bank-presets">
          <button class="bank-preset-btn" data-preset-deposit="10">+10</button>
          <button class="bank-preset-btn" data-preset-deposit="50">+50</button>
          <button class="bank-preset-btn" data-preset-deposit="100">+100</button>
          <button class="bank-preset-btn" data-preset-deposit="${t}">All (${t})</button>
        </div>
      </div>

      <div class="bank-action-panel">
        <div class="bank-action-panel__title">📤 Withdraw Gold from Savings</div>
        <div class="bank-input-row">
          <input type="number" id="bank-withdraw-input" class="bank-input" placeholder="Amount to withdraw" min="1" max="${e}" />
          <button class="bank-btn bank-btn--secondary" id="bank-withdraw-btn">Withdraw</button>
        </div>
        <div class="bank-presets">
          <button class="bank-preset-btn" data-preset-withdraw="10">+10</button>
          <button class="bank-preset-btn" data-preset-withdraw="50">+50</button>
          <button class="bank-preset-btn" data-preset-withdraw="100">+100</button>
          <button class="bank-preset-btn" data-preset-withdraw="${e}">All (${e})</button>
        </div>
      </div>

      <div class="bank-card-item">
        <div class="bank-card-item__info">
          <div class="bank-card-item__name">📈 Compound Interest Accrual</div>
          <div class="bank-card-item__desc">Your savings automatically accrue ${(s*100).toFixed(0)}% compound interest periodically while you explore and study.</div>
        </div>
        <div class="bank-card-item__actions">
          <button class="bank-btn bank-btn--success" id="bank-claim-interest-btn">Collect Interest</button>
        </div>
      </div>
    `}renderInvestmentsTab(){const t=this.bank.getActiveInvestments(),e=new Map(t.map(i=>[i.id,i])),s=Date.now();return`
      <div class="bank-list">
        ${G.map(i=>{const n=e.get(i.id);let o="";if(!n)o=`
          <button class="bank-btn bank-btn--primary" data-invest-id="${i.id}" data-cost="${i.cost}">
            Fund (${i.cost} G)
          </button>
        `;else{const d=s-(n.startedAt||s),b=Math.max(0,n.durationMs-d);if(b<=0){const g=Math.floor(n.cost*(1+n.expectedReturnRate));o=`
            <button class="bank-btn bank-btn--success" data-claim-invest-id="${i.id}">
              Claim (${g} G)
            </button>
          `}else o=`
            <button class="bank-btn bank-btn--secondary bank-btn--disabled" disabled>
              ⏳ ${Math.ceil(b/1e3)}s left
            </button>
          `}const r=(i.expectedReturnRate*100).toFixed(0),l=Math.floor(i.cost*(1+i.expectedReturnRate));return`
        <div class="bank-card-item">
          <div class="bank-card-item__info">
            <div class="bank-card-item__name">📊 ${this.escape(i.name)}</div>
            <div class="bank-card-item__desc">${this.escape(i.description)}</div>
            <div class="bank-card-item__meta">Cost: ${i.cost} G | Return: +${r}% (${l} G) | Duration: ${Math.round(i.durationMs/1e3)}s</div>
          </div>
          <div class="bank-card-item__actions">
            ${o}
          </div>
        </div>
      `}).join("")}
      </div>
    `}renderBusinessTab(){const t=this.bank.getAllBusinesses();return t.length===0?'<div class="bank-card-item__desc">No active enterprises registered in this municipality.</div>':`
      <div class="bank-list">
        ${t.map(s=>{const a=this.bank.calculateDailyNetProfit(s.id);return`
        <div class="bank-card-item">
          <div class="bank-card-item__info">
            <div class="bank-card-item__name">🏪 ${this.escape(s.name)} (Tier ${s.level})</div>
            <div class="bank-card-item__desc">Sector: ${s.type} | Staff: ${s.employees} employees</div>
            <div class="bank-card-item__meta">Daily Gross: ${s.dailyRevenue} G | Overhead: ${s.dailyExpenses} G | Net Margin: +${a} G / cycle</div>
          </div>
          <div class="bank-card-item__actions">
            <button class="bank-btn bank-btn--secondary bank-btn--disabled" disabled>Active</button>
          </div>
        </div>
      `}).join("")}
      </div>
    `}bindEvents(){var t,e,s,a;this.container&&((t=this.container.querySelector("#bank-close-btn"))==null||t.addEventListener("click",()=>{var i;this.destroy(),(i=this.onClose)==null||i.call(this)}),this.container.querySelectorAll(".bank-tab").forEach(i=>{i.addEventListener("click",()=>{const n=i.getAttribute("data-tab");n&&n!==this.activeTab&&(this.activeTab=n,this.feedbackMessage="",this.render())})}),this.container.querySelectorAll("[data-preset-deposit]").forEach(i=>{i.addEventListener("click",()=>{var r;const n=i.getAttribute("data-preset-deposit"),o=(r=this.container)==null?void 0:r.querySelector("#bank-deposit-input");o&&n&&(o.value=n)})}),this.container.querySelectorAll("[data-preset-withdraw]").forEach(i=>{i.addEventListener("click",()=>{var r;const n=i.getAttribute("data-preset-withdraw"),o=(r=this.container)==null?void 0:r.querySelector("#bank-withdraw-input");o&&n&&(o.value=n)})}),(e=this.container.querySelector("#bank-deposit-btn"))==null||e.addEventListener("click",()=>{var r,l;const i=(r=this.container)==null?void 0:r.querySelector("#bank-deposit-input"),n=parseInt((i==null?void 0:i.value)||"0",10);if(isNaN(n)||n<=0){this.feedbackMessage="Please enter a valid positive deposit amount.",this.feedbackIsError=!0,this.render();return}this.bank.deposit(n)?(this.feedbackMessage=`Successfully deposited ${n} Gold into savings vault.`,this.feedbackIsError=!1,(l=this.onTransactionComplete)==null||l.call(this)):(this.feedbackMessage="Failed to deposit gold. Check your purse funds and vault capacity.",this.feedbackIsError=!0),this.render()}),(s=this.container.querySelector("#bank-withdraw-btn"))==null||s.addEventListener("click",()=>{var r,l;const i=(r=this.container)==null?void 0:r.querySelector("#bank-withdraw-input"),n=parseInt((i==null?void 0:i.value)||"0",10);if(isNaN(n)||n<=0){this.feedbackMessage="Please enter a valid positive withdrawal amount.",this.feedbackIsError=!0,this.render();return}this.bank.withdraw(n)?(this.feedbackMessage=`Successfully withdrew ${n} Gold from savings vault.`,this.feedbackIsError=!1,(l=this.onTransactionComplete)==null||l.call(this)):(this.feedbackMessage="Failed to withdraw gold. Insufficient savings balance.",this.feedbackIsError=!0),this.render()}),(a=this.container.querySelector("#bank-claim-interest-btn"))==null||a.addEventListener("click",()=>{var n;const i=this.bank.applyInterest();i>0?(this.feedbackMessage=`Collected ${i} Gold in compound interest!`,this.feedbackIsError=!1,(n=this.onTransactionComplete)==null||n.call(this)):(this.feedbackMessage="No interest accrued yet. Keep funds saved over time to earn yield.",this.feedbackIsError=!1),this.render()}),this.container.querySelectorAll("[data-invest-id]").forEach(i=>{i.addEventListener("click",()=>{var l;const n=i.getAttribute("data-invest-id"),o=G.find(d=>d.id===n);if(!o)return;this.bank.startInvestment(o)?(this.feedbackMessage=`Funded "${o.name}" for ${o.cost} Gold!`,this.feedbackIsError=!1,(l=this.onTransactionComplete)==null||l.call(this)):(this.feedbackMessage=`Insufficient gold in purse to fund "${o.name}". Needed: ${o.cost} G.`,this.feedbackIsError=!0),this.render()})}),this.container.querySelectorAll("[data-claim-invest-id]").forEach(i=>{i.addEventListener("click",()=>{var r;const n=i.getAttribute("data-claim-invest-id");if(!n)return;const o=this.bank.claimInvestment(n);o.success?(this.feedbackMessage=`Venture matured! Claimed payout of ${o.payout} Gold!`,this.feedbackIsError=!1,(r=this.onTransactionComplete)==null||r.call(this)):(this.feedbackMessage="Investment is still active. Please wait for maturation.",this.feedbackIsError=!0),this.render()})}))}destroy(){this.container&&(this.container.remove(),this.container=null)}escape(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}const Q=[{id:"rival-novice-fizz",displayName:"Apprentice Fizz",level:2,rating:1e3,subjectFocus:f.Mathematics},{id:"rival-adept-valeria",displayName:"Scholar Valeria",level:5,rating:1250,subjectFocus:f.Science},{id:"rival-grandmaster-ignis",displayName:"Grandmaster Ignis",level:10,rating:1600,subjectFocus:f.GeneralKnowledge}];var Y=(u=>(u.Duel="duel",u.RankedTournament="ranked-tournament",u.PracticeSparring="practice-sparring",u))(Y||{}),C=(u=>(u.WaitingForOpponent="waiting-for-opponent",u.InProgress="in-progress",u.Resolved="resolved",u.Cancelled="cancelled",u))(C||{});class Le{calculateCombatantDifficulty(t,e){const s=e.level-t.level;let a=m.JuniorHigh,i=3,n=30,o="Balanced matchmaking tier";if(s>0)s>=5?(a=m.SeniorHigh,i=5,n=20,o=`Heavy Cognitive Challenge (Lower Level Handicap: -${s} Lv)`):(a=m.JuniorHigh,i=4,n=25,o=`Moderate Cognitive Challenge (Lower Level Handicap: -${s} Lv)`);else if(s<0){const r=Math.abs(s);r>=5?(a=m.Elementary,i=1,n=40,o=`Relaxed Cognitive Tier (Higher Level Handicap: +${r} Lv)`):(a=m.JuniorHigh,i=2,n=35,o=`Mild Cognitive Tier (Higher Level Handicap: +${r} Lv)`)}return{combatantId:t.id,opponentId:e.id,tier:a,targetDifficulty:i,timeLimitSeconds:n,handicapNote:o}}calculateMatchDifficulty(t,e){return[this.calculateCombatantDifficulty(t,e),this.calculateCombatantDifficulty(e,t)]}}const Re=new Le;class Ne{constructor(t){c(this,"matchDef");c(this,"playerProfile");c(this,"rivalProfile");c(this,"repository");c(this,"subject");c(this,"currentRound",1);c(this,"maxRounds");c(this,"playerScore",0);c(this,"rivalScore",0);c(this,"status",C.InProgress);const e=t.pvpEngine||Re;this.repository=t.repository||U,this.subject=t.subject||t.rival.subjectFocus||f.Mathematics,this.maxRounds=t.maxRounds||3;const[s,a]=e.calculateMatchDifficulty(t.player,t.rival);this.playerProfile=s,this.rivalProfile=a,this.matchDef={matchId:fe(),mode:t.mode||Y.PracticeSparring,status:C.InProgress,competitors:[t.player,t.rival],activeSubject:this.subject,roundLimit:this.maxRounds,timePerTurnSeconds:s.timeLimitSeconds,createdAt:Date.now()}}getMatchDefinition(){return{...this.matchDef,status:this.status}}getPlayerProfile(){return{...this.playerProfile}}getRivalProfile(){return{...this.rivalProfile}}getScores(){return{player:this.playerScore,rival:this.rivalScore}}getCurrentRound(){return this.currentRound}getMaxRounds(){return this.maxRounds}isResolved(){return this.status===C.Resolved}getWinnerId(){return this.matchDef.winnerId}samplePlayerQuestion(){const t=this.repository.filter({subject:this.subject,educationalTier:this.playerProfile.tier});if(t.length>0)return t[Math.floor(Math.random()*t.length)];const e=this.repository.filter({subject:this.subject});return e.length>0?e[0]:void 0}resolveRound(t){if(this.isResolved())return{round:this.currentRound,playerAnsweredCorrect:t,rivalAnsweredCorrect:!1,playerScore:this.playerScore,rivalScore:this.rivalScore};t&&(this.playerScore+=1);const e=this.rivalProfile.targetDifficulty<=2?.8:.6,s=Math.random()<e;s&&(this.rivalScore+=1);const a={round:this.currentRound,playerAnsweredCorrect:t,rivalAnsweredCorrect:s,playerScore:this.playerScore,rivalScore:this.rivalScore};return this.currentRound>=this.maxRounds?(this.status=C.Resolved,this.matchDef.resolvedAt=Date.now(),this.playerScore>this.rivalScore?this.matchDef.winnerId=this.matchDef.competitors[0].id:this.rivalScore>this.playerScore?this.matchDef.winnerId=this.matchDef.competitors[1].id:this.matchDef.winnerId=void 0):this.currentRound+=1,a}}class De{constructor(t={}){c(this,"container",null);c(this,"onClose");c(this,"onMatchComplete");c(this,"selectedRival",null);c(this,"activeSession",null);c(this,"activeQuestionModal",null);c(this,"lastRoundNote","");this.onClose=t.onClose,this.onMatchComplete=t.onMatchComplete}show(){this.destroy();const t=document.createElement("div");t.className="arena-overlay",t.id="arena-modal",document.body.appendChild(t),this.container=t,this.render()}render(){this.container&&(this.activeSession?this.renderDuelMatch():this.renderRivalSelection())}renderRivalSelection(){if(!this.container)return;const t=h.getPlayer(),e=Q.map(s=>{const a=s.level-t.level;let i="Balanced Duel";return a>0?i=`Opponent +${a} Lv (Reverse Handicap: You receive HARDER questions)`:a<0&&(i=`Opponent -${Math.abs(a)} Lv (Reverse Handicap: You receive EASIER questions)`),`
        <div class="arena-rival-item" data-rival-id="${s.id}">
          <div class="arena-rival-item__info">
            <div class="arena-rival-item__name">⚔️ ${this.escape(s.displayName)} (Level ${s.level})</div>
            <div class="arena-rival-item__meta">Subject Focus: ${s.subjectFocus} | Rating: ${s.rating}</div>
            <div class="arena-rival-item__meta" style="color: #f43f5e;">${i}</div>
          </div>
          <button class="arena-btn arena-btn--primary" data-start-rival="${s.id}">
            Spar
          </button>
        </div>
      `}).join("");this.container.innerHTML=`
      <div class="arena-card">
        <div class="arena-card__header">
          <div class="arena-card__title-area">
            <div class="arena-card__title">🏟️ Colosseum Sparring Grounds</div>
            <div class="arena-card__subtitle">Practice duels against rival scholars with Reverse Difficulty handicap balancing.</div>
          </div>
          <button class="arena-card__close" id="arena-close-btn">&times;</button>
        </div>
        <div class="arena-content">
          <div class="arena-handicap-banner">
            ⚖️ <strong>Reverse Difficulty Rule:</strong> In competitive arena duels, lower-level combatants are assigned harder questions to offset RPG stat advantages, balancing academic mastery against character grinding.
          </div>
          <div class="arena-rival-list">
            ${e}
          </div>
        </div>
        <div class="arena-card__footer">
          <span>Player: ${this.escape(t.name)} (Lv ${t.level})</span>
          <span>Colosseum Practice Arena</span>
        </div>
      </div>
    `,this.bindSelectionEvents()}renderDuelMatch(){if(!this.container||!this.activeSession||!this.selectedRival)return;const t=h.getPlayer(),e=this.activeSession.getScores(),s=this.activeSession.getCurrentRound(),a=this.activeSession.getMaxRounds(),i=this.activeSession.isResolved(),n=this.activeSession.getPlayerProfile();let o="";if(i){const l=this.activeSession.getWinnerId();l===t.id?o='<div class="arena-outcome-box arena-outcome-box--win">🏆 Match Victory! You triumphed in academic sparring!</div>':l===this.selectedRival.id?o=`<div class="arena-outcome-box arena-outcome-box--lose">💀 Defeat! ${this.escape(this.selectedRival.displayName)} outwitted you this time.</div>`:o='<div class="arena-outcome-box arena-outcome-box--tie">🤝 Standoff! Academic duel concluded in a tie!</div>'}const r=this.lastRoundNote?`<div style="font-size: 13px; text-align: center; color: #cbd5e1;">${this.lastRoundNote}</div>`:"";this.container.innerHTML=`
      <div class="arena-card">
        <div class="arena-card__header">
          <div class="arena-card__title-area">
            <div class="arena-card__title">⚔️ Arena Duel — Round ${Math.min(s,a)} of ${a}</div>
            <div class="arena-card__subtitle">${n.handicapNote}</div>
          </div>
          <button class="arena-card__close" id="arena-close-btn">&times;</button>
        </div>
        <div class="arena-content">
          <div class="arena-matchup-grid">
            <div class="arena-combatant arena-combatant--player">
              <span class="arena-combatant__name">🛡️ ${this.escape(t.name)}</span>
              <span class="arena-combatant__level">Lv ${t.level} (${n.tier})</span>
              <span class="arena-combatant__score">${e.player} pts</span>
            </div>
            <div class="arena-vs">VS</div>
            <div class="arena-combatant arena-combatant--rival">
              <span class="arena-combatant__name">🗡️ ${this.escape(this.selectedRival.displayName)}</span>
              <span class="arena-combatant__level">Lv ${this.selectedRival.level}</span>
              <span class="arena-combatant__score">${e.rival} pts</span>
            </div>
          </div>

          ${o}
          ${r}

          <div style="display: flex; justify-content: center; margin-top: 10px;">
            ${i?'<button class="arena-btn arena-btn--secondary" id="arena-finish-btn">Return to Matchmaking</button>':`<button class="arena-btn arena-btn--primary" id="arena-next-round-btn">Engage Round ${s}</button>`}
          </div>
        </div>
        <div class="arena-card__footer">
          <span>Question Timer: ${n.timeLimitSeconds}s</span>
          <span>Target Difficulty: ★ ${n.targetDifficulty}/5</span>
        </div>
      </div>
    `,this.bindDuelEvents()}bindSelectionEvents(){var t;this.container&&((t=this.container.querySelector("#arena-close-btn"))==null||t.addEventListener("click",()=>{var e;this.destroy(),(e=this.onClose)==null||e.call(this)}),this.container.querySelectorAll("[data-start-rival]").forEach(e=>{e.addEventListener("click",()=>{const s=e.getAttribute("data-start-rival"),a=Q.find(n=>n.id===s);if(!a)return;this.selectedRival=a;const i=h.getPlayer();this.activeSession=new Ne({player:{id:i.id,displayName:i.name,level:i.level},rival:a,subject:a.subjectFocus}),this.lastRoundNote="",this.render()})}))}bindDuelEvents(){var t,e,s;this.container&&((t=this.container.querySelector("#arena-close-btn"))==null||t.addEventListener("click",()=>{var a;this.destroy(),(a=this.onClose)==null||a.call(this)}),(e=this.container.querySelector("#arena-finish-btn"))==null||e.addEventListener("click",()=>{var a;this.activeSession=null,this.selectedRival=null,this.lastRoundNote="",(a=this.onMatchComplete)==null||a.call(this),this.render()}),(s=this.container.querySelector("#arena-next-round-btn"))==null||s.addEventListener("click",()=>{this.promptRoundQuestion()}))}promptRoundQuestion(){if(!this.activeSession)return;const t=this.activeSession.samplePlayerQuestion();if(!t){this.lastRoundNote="No question available for this tier. Round passed.",this.render();return}const e=this.activeSession.getPlayerProfile(),s={...t,timeLimit:e.timeLimitSeconds};this.activeQuestionModal=new V({question:s,onAnswer:a=>{var o,r,l,d;const i=a.outcome===W.Correct,n=(o=this.activeSession)==null?void 0:o.resolveRound(i);if(n){const b=i?"✅ You answered correctly!":"❌ You missed the question.",p=n.rivalAnsweredCorrect?`⚔️ ${this.escape(((r=this.selectedRival)==null?void 0:r.displayName)||"Rival")} answered correctly!`:`🛡️ ${this.escape(((l=this.selectedRival)==null?void 0:l.displayName)||"Rival")} made an error!`;this.lastRoundNote=`${b} | ${p}`}(d=this.activeQuestionModal)==null||d.destroy(),this.activeQuestionModal=null,this.render()}}),this.activeQuestionModal.show()}destroy(){this.activeQuestionModal&&(this.activeQuestionModal.destroy(),this.activeQuestionModal=null),this.container&&(this.container.remove(),this.container=null)}escape(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}new Set(Object.values(f));new Set(Object.values(ge));new Set(Object.values(A));new Set(Object.values(m));const q=1,je=5,Be={relaxDifficulty:!0,relaxTopics:!0,allowSubjectEmergency:!1,maxTierOverPlayer:0};function Ge(u){const t=Math.floor(u);return Number.isNaN(t)?q:Math.min(je,Math.max(q,t))}class Qe{constructor(t,e={}){c(this,"repository");c(this,"assignments");c(this,"professions");c(this,"tierConfig");c(this,"fallback");this.repository=t;const s=e.assignments??ye;this.assignments=new Map(s.map(i=>[i.id,i]));const a=e.professions??_e;this.professions=new Map(a.map(i=>[i.id,i])),this.tierConfig=e.tierConfig??ke,this.fallback={...Be,...e.fallback}}resolve(t){const e=Math.max(0,Math.floor(t.count)),s=this.assignments.get(t.assignmentId);if(!s)return{assignmentId:t.assignmentId,requestedCount:e,questions:[],effectiveTier:m.Elementary,effectiveDifficulty:q,professionPrioritized:!1,fallbackEvents:[],coverage:{professionTaggedMatches:0,subjectTopicMatches:0,hasProfessionCoverage:!1,satisfied:!1},missingCoverage:!0,message:`Unknown assignment '${t.assignmentId}'.`};const a=this.professions.get(s.professionId),i=s.educationalTier,n=this.effectiveTierFor(i,t.playerLevel),o=Ge(s.difficulty),r=this.subjectsFor(s,a),l=s.requiredQuestionTopics??[],d=(a==null?void 0:a.questionTags)??[],b=t.specialtyId?[t.specialtyId]:[],p=t.excludeIds??new Set,g=this.computeCoverage(r,l,n,d,b),y=[],L=new Set,R=[];let N=!1;const x=()=>y.length>=e,M=_=>{for(const I of _){if(x())return;p.has(I.id)||L.has(I.id)||(y.push(I),L.add(I.id),this.isPrioritizedQuestion(I,d,b)&&(N=!0))}},P=(_,I,J)=>{R.push({assignmentId:s.id,requestedTier:i,requestedDifficulty:o,resolvedTier:_,resolvedDifficulty:I,reason:J})};if(M(this.pool(r,{topics:l,educationalTier:n,difficulty:o,professionTags:d.length>0?d:void 0,specialtyTags:b.length>0?b:void 0})),x()||M(this.pool(r,{topics:l,educationalTier:n,difficulty:o})),!x()&&this.fallback.relaxDifficulty){const _=this.pool(r,{topics:l,educationalTier:n});_.length>0&&(P(n,_[0].difficulty,"Insufficient questions at the exact difficulty; relaxed within the tier"),M(_))}if(!x()&&this.fallback.relaxTopics&&l.length>0){const _=this.pool(r,{educationalTier:n});_.length>0&&(P(n,_[0].difficulty,"Insufficient topics; widened to the assignment subjects"),M(_))}if(!x()&&this.fallback.allowSubjectEmergency){const _=this.pool(r,{});_.length>0&&(P(_[0].educationalTier,_[0].difficulty,"Emergency fallback: used any available question in the assignment subjects"),M(_))}const D=x(),K=y.length>0?y[0].educationalTier:n,Z=y.length>0?y[0].difficulty:o;return{assignmentId:s.id,professionId:s.professionId,requestedCount:e,questions:y,effectiveTier:K,effectiveDifficulty:Z,professionPrioritized:N,fallbackEvents:R,coverage:{...g,satisfied:D},missingCoverage:!D,message:this.buildMessage(s,y.length,e,g)}}assessCoverage(t,e){const s=this.assignments.get(t);if(!s)return{professionTaggedMatches:0,subjectTopicMatches:0,hasProfessionCoverage:!1,satisfied:!1};const a=this.professions.get(s.professionId),i=this.subjectsFor(s,a),n=s.requiredQuestionTopics??[],o=(a==null?void 0:a.questionTags)??[],r=e?[e]:[];return this.computeCoverage(i,n,s.educationalTier,o,r)}computeCoverage(t,e,s,a,i){const n=e.length>0?{topics:[...e]}:{},o=this.pool(t,{...n,educationalTier:s}).length,r=this.pool(t,{...n,...a.length>0||i.length>0?{professionTags:a.length>0?[...a]:void 0,specialtyTags:i.length>0?[...i]:void 0}:{}}).length;return{professionTaggedMatches:r,subjectTopicMatches:o,hasProfessionCoverage:r>0,satisfied:!1}}buildMessage(t,e,s,a){if(e===0)return`No suitable questions found for '${t.title}'.`;const i=e<s?`Served ${e} of ${s} questions for '${t.title}'.`:`Served ${s} questions for '${t.title}'.`;return a.hasProfessionCoverage?i:`${i} No profession-tagged questions cover this assignment yet.`}effectiveTierFor(t,e){var r;const s=this.tierForLevel(e),a=this.tierIndex(t),i=this.tierIndex(s),n=Math.min(this.tierConfig.length-1,i+Math.max(0,Math.floor(this.fallback.maxTierOverPlayer))),o=Math.min(a,n);return((r=this.tierConfig[o])==null?void 0:r.tier)??t}tierForLevel(t){const e=Math.max(1,Math.floor(t));for(const s of this.tierConfig)if(e>=s.minLevel&&e<=s.maxLevel)return s.tier;return this.tierConfig[this.tierConfig.length-1].tier}tierIndex(t){const e=this.tierConfig.find(s=>s.tier===t);return e?e.tierIndex:0}subjectsFor(t,e){return t.requiredSubjects.length>0?[...t.requiredSubjects]:e?[...e.subjectTags]:[]}pool(t,e){const s=[];for(const a of t)s.push(...this.repository.filter({subject:a,...e}));return this.uniqueById(s)}uniqueById(t){const e=new Set,s=[];for(const a of t)e.has(a.id)||(e.add(a.id),s.push(a));return s}isPrioritizedQuestion(t,e,s){const a=t.professionTags??[],i=t.specialtyTags??[],n=e.length>0&&e.some(r=>a.includes(r)),o=s.length>0&&s.some(r=>i.includes(r));return n||o}}const v="2026-01-01T00:00:00.000Z";m.Elementary,f.Science,w.MultipleChoice,k.Published,m.Elementary,f.Science,w.Identification,k.Published,m.JuniorHigh,f.Science,w.MultipleChoice,k.Published,m.Elementary,f.Science,w.MultipleChoice,k.Published,m.Elementary,f.Physics,w.MultipleChoice,k.Published,m.JuniorHigh,f.Physics,w.MultipleChoice,k.Published,m.Elementary,f.Physics,w.MultipleChoice,k.Published,m.Elementary,f.Mathematics,w.MultipleChoice,k.Published,m.JuniorHigh,f.Mathematics,w.MultipleChoice,k.Published,m.Elementary,f.Mathematics,w.Identification,k.Published,m.Elementary,f.GeneralKnowledge,w.MultipleChoice,k.Published,m.Elementary,f.GeneralKnowledge,w.Identification,k.Published,m.Elementary,f.GeneralKnowledge,w.MultipleChoice,k.Published,m.JuniorHigh,f.GeneralKnowledge,w.MultipleChoice,k.Published,m.JuniorHigh,f.Science,w.MultipleChoice,k.Published;class He{constructor(t={}){c(this,"container",null);c(this,"options");c(this,"activeTab");c(this,"feedbackMessage","");c(this,"feedbackIsError",!1);c(this,"selectedAssignmentId",null);c(this,"activeQuestionModal",null);c(this,"questionQueue",[]);c(this,"pendingObjectiveId",null);this.options=t,this.activeTab=t.initialTab??(t.workplaceId?"workplace":"careers")}show(){this.destroy();const t=document.createElement("div");t.className="career-modal",t.id="career-modal",document.body.appendChild(t),this.container=t,this.render()}destroy(){this.activeQuestionModal&&(this.activeQuestionModal.destroy(),this.activeQuestionModal=null),this.container&&(this.container.remove(),this.container=null)}render(){if(!this.container)return;const t=!!this.options.workplaceId;this.container.innerHTML=`
      <div class="career-card">
        <div class="career-card__header">
          <div class="career-card__title-area">
            <span class="career-card__title">🎓 Career Center</span>
            <span class="career-card__subtitle">Real-world professions, independent of combat level</span>
          </div>
          <button class="career-card__close" id="career-close" type="button" aria-label="Close">×</button>
        </div>

        <div class="career-card__tabs">
          <button class="career-card__tab ${this.activeTab==="careers"?"career-card__tab--active":""}" id="career-tab-careers" type="button">Explore Professions</button>
          <button class="career-card__tab ${this.activeTab==="profile"?"career-card__tab--active":""}" id="career-tab-profile" type="button">My Career</button>
          ${t?`<button class="career-card__tab ${this.activeTab==="workplace"?"career-card__tab--active":""}" id="career-tab-workplace" type="button">Workplace</button>`:""}
        </div>

        <div class="career-card__content" id="career-content">
          ${this.renderContent()}
        </div>

        <div class="career-card__footer">
          <div class="career-card__feedback ${this.feedbackIsError?"career-card__feedback--error":"career-card__feedback--success"}">
            ${this.escape(this.feedbackMessage)}
          </div>
          <button class="career-card__done" id="career-done" type="button">Done</button>
        </div>
      </div>
    `,this.attachListeners(t)}renderContent(){return this.selectedAssignmentId?this.renderAssignmentDetail(this.selectedAssignmentId):this.activeTab==="careers"?this.renderCareers():this.activeTab==="profile"?this.renderProfile():this.renderWorkplace()}renderCareers(){const t=h.getCareerCatalogueView();if(t.professionCount===0)return'<div class="career-empty">No professions are available yet.</div>';const e=t.categories.map(s=>{const a=s.professions.map(i=>this.renderProfessionCard(i)).join("");return`
          <section class="career-category">
            <div class="career-category__header">
              <span class="career-category__name">${this.escape(s.name)}</span>
              <span class="career-category__desc">${this.escape(s.description)}</span>
            </div>
            <div class="career-cards">${a}</div>
          </section>
        `}).join("");return`
      <div class="career-summary">
        <span>${t.enrolledCount} of ${t.professionCount} professions enrolled</span>
      </div>
      ${e}
    `}renderProfessionCard(t){const e=t.requirements.length?`<ul class="career-reqs">${t.requirements.map(o=>`<li class="career-reqs__item ${o.satisfied?"career-reqs__item--ok":"career-reqs__item--fail"}">${o.satisfied?"✓":"✗"} ${this.escape(o.label)}</li>`).join("")}</ul>`:"",s=t.workplaceNames.length?`<div class="career-card__row"><span class="career-card__label">Workplaces:</span> ${t.workplaceNames.map(o=>this.escape(o)).join(", ")}</div>`:"",a=t.rankNames.length?`<div class="career-card__row"><span class="career-card__label">Ranks:</span> ${t.rankNames.map(o=>this.escape(o)).join(" → ")}</div>`:"",i=t.responsibilities.length?`<ul class="career-card__resp">${t.responsibilities.map(o=>`<li>${this.escape(o)}</li>`).join("")}</ul>`:"";let n="";return t.enrolled?n='<span class="career-badge career-badge--enrolled">Enrolled</span>':n=`<button class="career-btn career-btn--primary" data-enroll="${this.escape(t.id)}" ${t.canEnroll?"":"disabled"} type="button">Enroll</button>`,`
      <article class="career-card__item">
        <div class="career-card__item-head">
          <span class="career-card__item-name">${this.escape(t.name)}${t.provisional?' <span class="career-badge career-badge--provisional">provisional</span>':""}</span>
          ${n}
        </div>
        <p class="career-card__item-desc">${this.escape(t.description)}</p>
        ${i}
        ${s}
        ${a}
        ${e}
        <div class="career-card__item-msg ${t.canEnroll||t.enrolled?"":"career-card__item-msg--fail"}">${this.escape(t.enrollmentMessage)}</div>
      </article>
    `}renderProfile(){const t=h.getCareerProfileView();if(t.professions.length===0)return'<div class="career-empty">You are not enrolled in any profession yet. Visit the Explore Professions tab to begin.</div>';const e=t.professions.map(s=>{const a=s.activeAssignments.length?`<div class="career-profile__section">
              <span class="career-profile__section-title">Active Assignments</span>
              ${s.activeAssignments.map(o=>`
                <div class="career-assignment-line">
                  <button class="career-link" data-view-assignment="${this.escape(o.assignmentId)}" type="button">${this.escape(o.title)}</button>
                  <span class="career-assignment-line__meta">Stage ${o.stageNumber}/${o.stageCount} · ${this.escape(o.stageName)}</span>
                </div>`).join("")}
            </div>`:"",i=s.history.length?`<div class="career-profile__section">
              <span class="career-profile__section-title">Completed Assignments</span>
              <ul class="career-history">${s.history.map(o=>`<li>${this.escape(o.title)}</li>`).join("")}</ul>
            </div>`:"",n=s.isMaxLevel?'<span class="career-badge career-badge--max">Max Level</span>':`<div class="career-exp">
              <div class="career-exp__bar"><div class="career-exp__fill" style="width: ${Math.round(s.progressRatio*100)}%"></div></div>
              <span class="career-exp__text">${s.currentExp} / ${s.requiredExp} EXP</span>
            </div>`;return`
          <article class="career-profile__entry">
            <div class="career-profile__entry-head">
              <span class="career-profile__name">${this.escape(s.name)}</span>
              <span class="career-profile__level">Lv. ${s.level} / ${s.maxLevel}</span>
            </div>
            <div class="career-profile__stats">
              <span>Rank: <strong>${this.escape(s.rankName||s.rankId)}</strong></span>
              <span>Reputation: <strong>${s.reputation}</strong></span>
              <span>Status: <strong>${this.escape(s.status)}</strong></span>
            </div>
            ${n}
            ${a}
            ${i}
          </article>
        `}).join("");return`
      <div class="career-summary">
        <span>Total completed assignments: <strong>${t.totalCompletedAssignments}</strong></span>
        <span>Total reputation: <strong>${t.totalReputation}</strong></span>
      </div>
      ${e}
    `}renderWorkplace(){const t=this.options.workplaceId;if(!t)return'<div class="career-empty">No workplace selected.</div>';const e=h.getWorkplaceView(t);if(!e)return`<div class="career-empty">Unknown workplace '${this.escape(t)}'.</div>`;const s=e.facilities.length?`<div class="career-wp__facilities">${e.facilities.map(r=>`
          <div class="career-wp__facility ${r.accessible?"":"career-wp__facility--locked"}">
            <div class="career-wp__facility-head">
              <span>${this.escape(r.name)}</span>
              <span class="career-badge ${r.accessible?"career-badge--open":"career-badge--locked"}">${r.accessible?"Open":"Locked"}</span>
            </div>
            <div class="career-wp__facility-desc">${this.escape(r.description)}</div>
          </div>`).join("")}</div>`:"",a=e.npcIds.length?`<div class="career-card__row"><span class="career-card__label">Staff / Contacts:</span> ${e.npcIds.map(r=>this.escape(r)).join(", ")}</div>`:"",i=e.activities.length?`<div class="career-card__row"><span class="career-card__label">Profession Activities:</span> ${e.activities.map(r=>this.escape(r)).join(" · ")}</div>`:"",n=e.availableAssignments.length?`<div class="career-wp__offers">${e.availableAssignments.map(r=>`
          <div class="career-offer">
            <div class="career-offer__info">
              <span class="career-offer__title">${this.escape(r.title)}</span>
              <span class="career-offer__meta">${this.escape(r.taskType)} · Diff ${r.difficulty}</span>
            </div>
            <button class="career-btn" data-view-assignment="${this.escape(r.assignmentId)}" type="button">View</button>
          </div>`).join("")}</div>`:'<div class="career-empty">No professional assignments are offered here.</div>',o=e.entryRequirements.length?`<ul class="career-reqs">${e.entryRequirements.map(r=>`<li class="career-reqs__item ${r.satisfied?"career-reqs__item--ok":"career-reqs__item--fail"}">${r.satisfied?"✓":"✗"} ${this.escape(r.label)}</li>`).join("")}</ul>`:"";return`
      <div class="career-wp">
        <div class="career-wp__head">
          <span class="career-wp__name">${this.escape(e.name)}</span>
          <span class="career-badge ${e.canEnter?"career-badge--open":"career-badge--locked"}">${e.canEnter?"Access Granted":"Restricted"}</span>
        </div>
        <p class="career-wp__desc">${this.escape(e.description)}</p>
        <div class="career-card__row"><span class="career-card__label">Professions:</span> ${e.professions.map(r=>this.escape(r.name)).join(", ")||"—"}</div>
        ${a}
        ${i}
        ${o}
        <div class="career-wp__msg ${e.canEnter?"":"career-card__item-msg--fail"}">${this.escape(e.entryMessage)}</div>
        <div class="career-wp__section-title">Facilities</div>
        ${s}
        <div class="career-wp__section-title">Available Assignments</div>
        ${n}
      </div>
    `}renderAssignmentDetail(t){const e=h.getAssignmentView(t);if(!e)return`
        <div class="career-empty">Unknown assignment '${this.escape(t)}'.</div>
        <button class="career-btn" id="career-back" type="button">← Back</button>
      `;const s=e.requirements.length?`<ul class="career-reqs">${e.requirements.map(d=>`<li class="career-reqs__item ${d.satisfied?"career-reqs__item--ok":"career-reqs__item--fail"}">${d.satisfied?"✓":"✗"} ${this.escape(d.label)}</li>`).join("")}</ul>`:"",a=e.stages.map(d=>{const b=d.objectives.map(g=>this.renderObjective(e.id,g,d.active)).join("");return`
          <div class="career-stage ${d.complete?"career-stage--complete":d.active?"career-stage--active":"career-stage--pending"}">
            <div class="career-stage__head">
              <span class="career-stage__name">${this.escape(d.name)}</span>
              <span class="career-stage__state">${d.complete?"Complete":d.active?"In Progress":"Locked"}</span>
            </div>
            ${d.description?`<div class="career-stage__desc">${this.escape(d.description)}</div>`:""}
            ${b}
          </div>
        `}).join(""),i=[];e.rewards.professionExp&&i.push(`${e.rewards.professionExp} profession EXP`),e.rewards.characterExp&&i.push(`${e.rewards.characterExp} combat EXP`),e.rewards.gold&&i.push(`${e.rewards.gold} gold`),e.rewards.reputation&&i.push(`${e.rewards.reputation} reputation`);for(const d of e.rewards.subjectMasteryExp)i.push(`${d.amount} ${d.subject} mastery`);const n=i.length?i.map(d=>`<span class="career-reward">${this.escape(d)}</span>`).join(""):'<span class="career-reward career-reward--none">No rewards</span>',o=e.questionTopics.length||e.subjects.length?`<div class="career-card__row"><span class="career-card__label">Related questions:</span> ${[...e.questionTopics,...e.subjects].map(d=>this.escape(d)).join(", ")}</div>`:"",r=e.stages.some(d=>d.objectives.some(b=>b.type===A.AnswerQuestions)),l=[];return l.push('<button class="career-btn" id="career-back" type="button">← Back</button>'),e.status==="available"&&l.push(`<button class="career-btn career-btn--primary" data-accept="${this.escape(e.id)}" type="button">Accept</button>`),e.active&&(r&&l.push(`<button class="career-btn career-btn--primary" data-answer="${this.escape(e.id)}" type="button">Answer Questions</button>`),e.stages.every(b=>b.complete)&&l.push(`<button class="career-btn career-btn--primary" data-complete="${this.escape(e.id)}" type="button">Complete</button>`),l.push(`<button class="career-btn career-btn--danger" data-abandon="${this.escape(e.id)}" type="button">Abandon</button>`)),`
      <div class="career-assignment">
        <div class="career-assignment__head">
          <span class="career-assignment__title">${this.escape(e.title)}</span>
          <span class="career-badge career-badge--status">${this.escape(e.status)}</span>
        </div>
        <div class="career-assignment__meta">${this.escape(e.professionName)} · ${this.escape(e.taskType)} · Diff ${e.difficulty}${e.repeatable?" · Repeatable":""}</div>
        <p class="career-assignment__desc">${this.escape(e.description)}</p>
        ${o}
        <div class="career-wp__section-title">Requirements</div>
        ${s||'<div class="career-empty">No special requirements.</div>'}
        <div class="career-wp__section-title">Stages &amp; Objectives</div>
        ${a}
        <div class="career-wp__section-title">Rewards</div>
        <div class="career-rewards">${n}</div>
        <div class="career-assignment__msg">${this.escape(e.message)}</div>
        <div class="career-assignment__actions">${l.join("")}</div>
      </div>
    `}renderObjective(t,e,s){const i=s&&!e.complete&&e.type!==A.AnswerQuestions?`<button class="career-link" data-progress="${this.escape(t)}:${this.escape(e.id)}:${e.required}" type="button">Mark Done</button>`:"";return`
      <div class="career-objective ${e.complete?"career-objective--done":""}">
        <span class="career-objective__desc">${e.complete?"✓":"○"} ${this.escape(e.description)}</span>
        <span class="career-objective__progress">${e.progress} / ${e.required} ${i}</span>
      </div>
    `}attachListeners(t){var e,s,a,i,n,o;this.container&&((e=this.container.querySelector("#career-close"))==null||e.addEventListener("click",()=>{var r,l;this.destroy(),(l=(r=this.options).onClose)==null||l.call(r)}),(s=this.container.querySelector("#career-done"))==null||s.addEventListener("click",()=>{var r,l;this.destroy(),(l=(r=this.options).onClose)==null||l.call(r)}),(a=this.container.querySelector("#career-tab-careers"))==null||a.addEventListener("click",()=>this.switchTab("careers")),(i=this.container.querySelector("#career-tab-profile"))==null||i.addEventListener("click",()=>this.switchTab("profile")),t&&((n=this.container.querySelector("#career-tab-workplace"))==null||n.addEventListener("click",()=>this.switchTab("workplace"))),(o=this.container.querySelector("#career-back"))==null||o.addEventListener("click",()=>{this.selectedAssignmentId=null,this.feedbackMessage="",this.render()}),this.container.querySelectorAll("[data-enroll]").forEach(r=>{r.addEventListener("click",()=>this.handleEnroll(r.dataset.enroll??""))}),this.container.querySelectorAll("[data-view-assignment]").forEach(r=>{r.addEventListener("click",()=>{this.selectedAssignmentId=r.dataset.viewAssignment??null,this.feedbackMessage="",this.render()})}),this.container.querySelectorAll("[data-accept]").forEach(r=>{r.addEventListener("click",()=>this.handleAccept(r.dataset.accept??""))}),this.container.querySelectorAll("[data-answer]").forEach(r=>{r.addEventListener("click",()=>this.handleAnswerQuestions(r.dataset.answer??""))}),this.container.querySelectorAll("[data-progress]").forEach(r=>{r.addEventListener("click",()=>this.handleObjectiveProgress(r.dataset.progress??""))}),this.container.querySelectorAll("[data-complete]").forEach(r=>{r.addEventListener("click",()=>this.handleComplete(r.dataset.complete??""))}),this.container.querySelectorAll("[data-abandon]").forEach(r=>{r.addEventListener("click",()=>this.handleAbandon(r.dataset.abandon??""))}))}switchTab(t){this.activeTab=t,this.selectedAssignmentId=null,this.feedbackMessage="",this.render()}handleEnroll(t){var s,a;if(!t)return;const e=h.careers.enroll(t,h.buildEnrollmentContext());this.feedbackMessage=e.message,this.feedbackIsError=!e.success,e.success&&(h.saveSession(),(a=(s=this.options).onSessionChanged)==null||a.call(s)),this.render()}handleAccept(t){var s,a;if(!t)return;const e=h.assignments.acceptAssignment(t,h.buildAssignmentContext());this.feedbackMessage=e.message,this.feedbackIsError=!e.success,e.success&&(h.saveSession(),(a=(s=this.options).onSessionChanged)==null||a.call(s)),this.render()}handleComplete(t){var s,a;if(!t)return;const e=h.assignments.completeAssignment(t);this.feedbackMessage=e.message,this.feedbackIsError=!e.success,e.success&&(h.saveSession(),(a=(s=this.options).onSessionChanged)==null||a.call(s)),this.render()}handleAbandon(t){var s,a;if(!t)return;const e=h.assignments.failAssignment(t);this.feedbackMessage=e.message,this.feedbackIsError=!e.success,e.success&&(h.saveSession(),(a=(s=this.options).onSessionChanged)==null||a.call(s)),this.render()}handleObjectiveProgress(t){var r,l;const[e,s,a]=t.split(":");if(!e||!s)return;const i=Number.parseInt(a??"1",10),n=Number.isFinite(i)&&i>0?i:1,o=h.assignments.recordObjectiveProgress(e,s,n);this.feedbackMessage=o.message,this.feedbackIsError=!o.success,o.success&&(h.saveSession(),(l=(r=this.options).onSessionChanged)==null||l.call(r)),this.render()}handleAnswerQuestions(t){const e=h.assignments.getAssignment(t),s=h.assignments.getActiveAssignment(t);if(!e||!s)return;const a=e.stages[s.stageIndex],i=a==null?void 0:a.objectives.find(l=>l.type===A.AnswerQuestions);if(!i){this.feedbackMessage="No question-backed objectives in the current stage.",this.feedbackIsError=!0,this.render();return}const n=h.getPlayer().level,r=new Qe(U).resolve({assignmentId:t,count:i.required,playerLevel:n});if(r.questions.length===0){this.feedbackMessage=r.message,this.feedbackIsError=!0,this.render();return}this.pendingObjectiveId=i.id,this.questionQueue=[...r.questions],this.presentNextQuestion()}presentNextQuestion(){const t=this.selectedAssignmentId,e=this.questionQueue.shift();if(!e||!t||!this.pendingObjectiveId){this.pendingObjectiveId=null,this.questionQueue=[],this.render();return}this.activeQuestionModal=new V({question:e,autoCloseDelayMs:1200,onAnswer:s=>{s.outcome===W.Correct&&t&&this.pendingObjectiveId&&(h.assignments.recordObjectiveProgress(t,this.pendingObjectiveId,1),h.saveSession())},onClose:()=>{this.activeQuestionModal=null,this.presentNextQuestion()}}),this.activeQuestionModal.show()}escape(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}const Oe={"village-general-store":{id:"village-general-store",name:"Beginner's General Store",merchantNpcId:"merchant-barnaby",sellPriceMultiplier:.5,catalog:[{itemId:"wooden-sword",buyPrice:20},{itemId:"cloth-tunic",buyPrice:15},{itemId:"leather-cap",buyPrice:15},{itemId:"minor-health-potion",buyPrice:10},{itemId:"minor-mana-potion",buyPrice:12}]},"scholars-apothecary":{id:"scholars-apothecary",name:"Scholar's Curios & Gear",merchantNpcId:"scholar-lyra",sellPriceMultiplier:.6,catalog:[{itemId:"scholars-hood",buyPrice:100},{itemId:"copper-ring",buyPrice:35},{itemId:"amulet-of-logic",buyPrice:150},{itemId:"minor-mana-potion",buyPrice:12}]},"capital-grand-bazaar":{id:"capital-grand-bazaar",name:"Grand Bazaar of the Capital",merchantNpcId:"merchant-cordelia",sellPriceMultiplier:.55,catalog:[{itemId:"iron-blade",buyPrice:120},{itemId:"leather-vest",buyPrice:110},{itemId:"scholars-hood",buyPrice:180},{itemId:"amulet-of-logic",buyPrice:200},{itemId:"minor-health-potion",buyPrice:20},{itemId:"minor-mana-potion",buyPrice:22}]}};function H(u){return Object.values(Oe).find(t=>t.merchantNpcId===u)}const O=new Set(["math-building","library","science-lab","tech-workshop"]),Fe={"math-building":"math-building",library:"general-knowledge-library","science-lab":"science-laboratory","tech-workshop":"technology-workshop"},F=80,T=class T extends te.Scene{constructor(){super({key:T.KEY});c(this,"mapData",se);c(this,"player");c(this,"obstacles");c(this,"inputAdapter");c(this,"spawnPosition",{x:600,y:550});c(this,"isTransitioning",!1);c(this,"zoneWarningModal",new Me);c(this,"interactPrompt");c(this,"nearbyBuilding",null);c(this,"nearbyNPC",null);c(this,"activeDialogueModal",null);c(this,"activeShopModal",null);c(this,"activeBankModal",null);c(this,"activeArenaModal",null);c(this,"activeCareerModal",null);c(this,"npcs",[]);c(this,"explorationUI",null);c(this,"currentDirection","down");c(this,"interactionGuard",new ie({cooldownMs:300}))}init(e){this.isTransitioning=!1,this.nearbyBuilding=null,this.interactionGuard.reset(),e!=null&&e.spawnPosition?this.spawnPosition={...e.spawnPosition}:this.spawnPosition={x:600,y:550}}create(){this.cameras.main.fadeIn(250,10,10,15),we.playMusic("bgm-village"),h.saveSession();const{width:e,height:s}=this.mapData.bounds;this.physics.world.setBounds(0,0,e,s);const a=this.add.graphics();a.fillStyle(2311208,1),a.fillRect(0,0,e,s),a.lineStyle(1,1783584,.4);for(let i=0;i<e;i+=64)a.lineBetween(i,0,i,s);for(let i=0;i<s;i+=64)a.lineBetween(0,i,e,i);a.fillStyle(7695187,.85),a.fillCircle(600,400,140),a.fillRect(560,400,80,400),a.fillRect(160,360,800,80),this.obstacles=this.physics.add.staticGroup(),this.createLandmarks(),this.createPlayer(),this.createExits(),this.createNPCs(),this.inputAdapter=new ae(this),this.cameras.main.setBounds(0,0,e,s),this.cameras.main.startFollow(this.player,!0,.08,.08),this.interactPrompt=this.add.text(0,0,"",{fontFamily:"Arial",fontSize:"13px",color:"#ffffff",backgroundColor:"#000000cc",padding:{x:8,y:5}}).setDepth(10).setVisible(!1),this.explorationUI=new ne({scene:this,inputAdapter:this.inputAdapter,playerSprite:this.player,onQuitToMenu:()=>{this.cameras.main.fade(300,10,10,15,!1,(i,n)=>{n===1&&this.scene.start("BootScene")})}}),this.add.text(this.scale.width-16,16,`${this.mapData.name} (Lv. ${this.mapData.entryRequirements.recommendedMinLevel}–${this.mapData.entryRequirements.recommendedMaxLevel})`,{fontFamily:"Arial",fontSize:"14px",color:"#f0c060",backgroundColor:"#111827dd",padding:{x:8,y:4}}).setScrollFactor(0).setOrigin(1,0),this.input.keyboard&&(this.input.keyboard.on("keydown-SPACE",()=>this.attemptInteract()),this.input.keyboard.on("keydown-ENTER",()=>this.attemptInteract()))}update(){var i,n,o,r,l;if(this.isTransitioning||!((i=this.player)!=null&&i.body)||this.activeDialogueModal||this.activeShopModal||this.activeCareerModal||(n=this.explorationUI)!=null&&n.isPanelOpen()){(o=this.player)!=null&&o.anims&&this.player.anims.isPlaying&&((r=this.player.anims.currentAnim)!=null&&r.key.includes("walk"))&&this.player.play(`player-idle-${this.currentDirection}`,!0);return}const e=this.inputAdapter.getInputState(),s=re(e,ue);this.player.setVelocity(s.vx,s.vy);const a=oe(s.vx,s.vy,this.currentDirection);this.currentDirection=a.direction,((l=this.player.anims.currentAnim)==null?void 0:l.key)!==a.animationKey&&this.player.play(a.animationKey,!0),this.checkBuildingProximity(),this.checkNPCProximity()}createNPCs(){this.npcs=ce(this.mapData.id);const e=h.getPlayer().level;for(const s of this.npcs){const{x:a,y:i}=s.position,n=this.add.graphics();n.fillStyle(s.spriteColor,1),n.fillCircle(a,i,16),n.lineStyle(2,16777215,.8),n.strokeCircle(a,i,16);const o=h.quests.getNpcQuestStatus(s.id,e),r=o==="ready-turn-in"?"❓ ":o==="available"?"❗ ":"";this.add.text(a,i-28,`${r}${s.name}`,{fontFamily:"Arial",fontSize:"11px",color:o!=="none"?"#f6e05e":"#ffffff",backgroundColor:"#00000088",padding:{x:4,y:2}}).setOrigin(.5)}}checkNPCProximity(){const e=this.player.x,s=this.player.y,a=h.getPlayer().level;let i=null,n=1/0;for(const o of this.npcs){const r=Math.abs(e-o.position.x),l=Math.abs(s-o.position.y),d=Math.max(r,l);d<F&&d<n&&(n=d,i=o)}if(this.nearbyNPC=i,i&&!this.nearbyBuilding){const o=H(i.id);let r="Talk",l="💬";if(o)r="Trade / Shop",l="🏪";else if(i.workplaceId)r="Visit Workplace",l="🎓";else{const d=h.quests.getNpcQuestStatus(i.id,a);r=d==="ready-turn-in"?"Turn in Quest":d==="available"?"Accept Quest":"Talk"}this.interactPrompt.setText(`${l} ${i.name}
[SPACE / ENTER] ${r}`).setPosition(this.player.x-60,this.player.y-80).setVisible(!0)}else!i&&!this.nearbyBuilding&&this.interactPrompt.setVisible(!1)}createLandmarks(){for(const e of this.mapData.landmarks){const{x:s,y:a}=e.position,{width:i,height:n,color:o,name:r}=e,l=this.add.graphics();l.fillStyle(o,1),l.fillRect(s-i/2,a-n/2,i,n),l.lineStyle(2,16777215,.4),l.strokeRect(s-i/2,a-n/2,i,n);const d=O.has(e.id);this.add.text(s,a-n/2-14,r,{fontFamily:"Arial",fontSize:"11px",color:"#ffffff",backgroundColor:d?"#3b1d0888":"#00000088",padding:{x:4,y:2}}).setOrigin(.5),d&&this.add.text(s,a+n/2+10,"[SPACE] Enter",{fontFamily:"Arial",fontSize:"10px",color:"#fcd34d",backgroundColor:"#00000088",padding:{x:3,y:1}}).setOrigin(.5);const b=this.add.rectangle(s,a,i,n);this.physics.add.existing(b,!0),this.obstacles.add(b)}}createPlayer(){le.initPlayerAnimations(this),this.player=this.physics.add.sprite(this.spawnPosition.x,this.spawnPosition.y,"player-frame-down-idle"),this.player.setCollideWorldBounds(!0),this.player.body.setSize(24,28),this.player.body.setOffset(2,6),this.player.play("player-idle-down"),this.physics.add.collider(this.player,this.obstacles)}createExits(){for(const e of this.mapData.connections){const{x:s,y:a}=e.exitPosition,{exitWidth:i,exitHeight:n,targetMapId:o,entryPosition:r}=e,l=this.add.graphics();l.fillStyle(16096779,.4),l.fillRect(s-i/2,a-n/2,i,n),l.lineStyle(2,16096779,.9),l.strokeRect(s-i/2,a-n/2,i,n),this.add.text(s,a-n/2-14,"To Hunting Ground →",{fontFamily:"Arial",fontSize:"11px",color:"#fbbf24",backgroundColor:"#000000aa",padding:{x:4,y:2}}).setOrigin(.5);const d=this.add.zone(s,a,i,n);this.physics.add.existing(d,!0),this.physics.add.overlap(this.player,d,()=>{this.initiateZoneEntry(o,r,"beginners-hunting-ground")})}}checkBuildingProximity(){const e=this.player.x,s=this.player.y;let a=null,i=1/0;for(const n of this.mapData.landmarks){if(!O.has(n.id))continue;const o=Fe[n.id],r=he[o];if(r&&de(e,s,n.position.x,n.position.y,F)){const l=Math.abs(e-n.position.x),d=Math.abs(s-n.position.y),b=Math.max(l,d);b<i&&(i=b,a=r)}}this.nearbyBuilding=a,a?this.interactPrompt.setText(`${a.name}
[SPACE / ENTER] Enter`).setPosition(this.player.x-60,this.player.y-80).setVisible(!0):this.interactPrompt.setVisible(!1)}attemptInteract(){var i,n;if(this.isTransitioning||this.activeDialogueModal||this.activeShopModal||this.activeBankModal||this.activeArenaModal||this.activeCareerModal||(i=this.explorationUI)!=null&&i.isPanelOpen()||!this.interactionGuard.canTrigger())return;if(this.nearbyNPC){if(this.nearbyNPC.id==="gladius-the-bold"){this.openArenaModal();return}if(this.nearbyNPC.id==="treasurer-aurelius"){this.openBankModal();return}const o=H(this.nearbyNPC.id);o?this.openShopModal(o):this.nearbyNPC.workplaceId&&(((n=this.nearbyNPC.offeredQuestIds)==null?void 0:n.length)??0)===0?this.openCareerModal(this.nearbyNPC.workplaceId):this.openNPCDialogue(this.nearbyNPC);return}if(!this.nearbyBuilding)return;const e=this.nearbyBuilding,s=e.huntingZoneIds[0];!s||!j[s]||this.initiateZoneEntry(s,{x:300,y:300},s,e.name)}openNPCDialogue(e){if(this.activeDialogueModal||this.activeShopModal||this.activeBankModal||this.activeArenaModal)return;this.player.setVelocity(0,0);const s=h.getPlayer(),a=e.workplaceId;this.activeDialogueModal=new Ce({npc:e,questManager:h.quests,playerLevel:s.level,onClose:()=>{this.activeDialogueModal=null,h.saveSession()},onQuestUpdate:()=>{h.saveSession()},onOpenCareer:a?()=>{var i;(i=this.activeDialogueModal)==null||i.destroy(),this.activeDialogueModal=null,this.openCareerModal(a)}:void 0}),this.activeDialogueModal.show()}openCareerModal(e){this.activeCareerModal||(this.player.setVelocity(0,0),this.activeCareerModal=new He({workplaceId:e,onClose:()=>{this.activeCareerModal=null,h.saveSession()},onSessionChanged:()=>{var s;(s=this.explorationUI)==null||s.refreshHUD(),h.saveSession()}}),this.activeCareerModal.show())}openShopModal(e){this.activeShopModal||this.activeDialogueModal||this.activeBankModal||this.activeArenaModal||(this.player.setVelocity(0,0),this.activeShopModal=new Te({shop:e,onClose:()=>{this.activeShopModal=null,h.saveSession()},onTransactionComplete:()=>{var s;(s=this.explorationUI)==null||s.refreshHUD()}}),this.activeShopModal.show())}openBankModal(){this.activeBankModal||this.activeShopModal||this.activeDialogueModal||this.activeArenaModal||(this.player.setVelocity(0,0),this.activeBankModal=new qe({onClose:()=>{this.activeBankModal=null,h.saveSession()},onTransactionComplete:()=>{var e;(e=this.explorationUI)==null||e.refreshHUD(),h.saveSession()}}),this.activeBankModal.show())}openArenaModal(){this.activeArenaModal||this.activeBankModal||this.activeShopModal||this.activeDialogueModal||(this.player.setVelocity(0,0),this.activeArenaModal=new De({onClose:()=>{this.activeArenaModal=null},onMatchComplete:()=>{h.saveSession()}}),this.activeArenaModal.show())}initiateZoneEntry(e,s,a,i){if(this.isTransitioning)return;const n=j[a];if(!n){this.doTransition(e,s);return}const o=h.getPlayer(),r=i??n.name,l=Ie(o.level,n.averageMonsterLevel,r,n.recommendedMinLevel);l.isDangerous?(this.player.setVelocity(0,0),this.zoneWarningModal.show(l,r,d=>{d&&this.doTransition(e,s)})):this.doTransition(e,s)}doTransition(e,s){this.isTransitioning||(this.isTransitioning=!0,this.interactionGuard.setLocked(!0),this.player.setVelocity(0,0),h.saveSession(),this.cameras.main.fade(250,10,10,15,!1,(a,i)=>{i===1&&this.scene.start("HuntingScene",{spawnPosition:s,zoneId:e})}))}shutdown(){var e,s,a,i,n,o;(e=this.explorationUI)==null||e.destroy(),this.explorationUI=null,this.zoneWarningModal.destroy(),(s=this.activeDialogueModal)==null||s.destroy(),this.activeDialogueModal=null,(a=this.activeShopModal)==null||a.destroy(),this.activeShopModal=null,(i=this.activeBankModal)==null||i.destroy(),this.activeBankModal=null,(n=this.activeArenaModal)==null||n.destroy(),this.activeArenaModal=null,(o=this.activeCareerModal)==null||o.destroy(),this.activeCareerModal=null}};c(T,"KEY","VillageScene");let z=T;export{z as VillageScene};
