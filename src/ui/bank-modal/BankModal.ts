import { BankService } from '../../economy/BankService';
import { CurrencyService } from '../../economy/CurrencyService';
import { AVAILABLE_INVESTMENTS, AVAILABLE_BUSINESSES } from '../../economy/BankRegistry';
import type { InvestmentOpportunity } from '../../economy/BankTypes';
import { playerSessionManager } from '../../player';
import './bank-modal.css';

export interface BankModalOptions {
  bankService?: BankService;
  currencyService?: CurrencyService;
  onClose?: () => void;
  onTransactionComplete?: () => void;
}

type BankTab = 'savings' | 'investments' | 'business';

/**
 * BankModal — HTML/CSS DOM Overlay for Beginners Village Bank & Commerce.
 * Supports depositing gold, withdrawing savings, accruing compound interest,
 * starting venture investments with maturation timers, and inspecting player enterprises.
 */
export class BankModal {
  private container: HTMLDivElement | null = null;
  private readonly bank: BankService;
  private readonly currency: CurrencyService;
  private readonly onClose?: () => void;
  private readonly onTransactionComplete?: () => void;

  private activeTab: BankTab = 'savings';
  private feedbackMessage = '';
  private feedbackIsError = false;

  constructor(options: BankModalOptions = {}) {
    this.bank = options.bankService || playerSessionManager.bank;
    this.currency = options.currencyService || playerSessionManager.currency;
    this.onClose = options.onClose;
    this.onTransactionComplete = options.onTransactionComplete;

    // Seed default businesses into bank service if empty
    if (this.bank.getAllBusinesses().length === 0) {
      for (const biz of AVAILABLE_BUSINESSES) {
        this.bank.registerBusiness(biz);
      }
    }
  }

  show(): void {
    this.destroy();

    // Check & apply any accrued interest upon opening bank
    const interestEarned = this.bank.applyInterest();
    if (interestEarned > 0) {
      this.feedbackMessage = `Accrued ${interestEarned} Gold in compound savings interest!`;
      this.feedbackIsError = false;
      this.onTransactionComplete?.();
    }

    const container = document.createElement('div');
    container.className = 'bank-modal';
    container.id = 'bank-modal';

    document.body.appendChild(container);
    this.container = container;

    this.render();
  }

  render(): void {
    if (!this.container) return;

    const purseGold = this.currency.getGold();
    const savingsBalance = this.bank.getSavingsBalance();
    const config = this.bank.getConfig();

    const tabsHtml = `
      <div class="bank-tabs">
        <button class="bank-tab ${this.activeTab === 'savings' ? 'bank-tab--active' : ''}" data-tab="savings">
          🏦 Savings & Vault
        </button>
        <button class="bank-tab ${this.activeTab === 'investments' ? 'bank-tab--active' : ''}" data-tab="investments">
          📈 Venture Investments
        </button>
        <button class="bank-tab ${this.activeTab === 'business' ? 'bank-tab--active' : ''}" data-tab="business">
          🏪 Commercial Enterprises
        </button>
      </div>
    `;

    const feedbackHtml = this.feedbackMessage
      ? `<div class="bank-feedback ${this.feedbackIsError ? 'bank-feedback--error' : 'bank-feedback--success'}">
          ${this.escape(this.feedbackMessage)}
         </div>`
      : '';

    let contentHtml = '';
    if (this.activeTab === 'savings') {
      contentHtml = this.renderSavingsTab(purseGold, savingsBalance, config.interestRatePerInterval);
    } else if (this.activeTab === 'investments') {
      contentHtml = this.renderInvestmentsTab();
    } else {
      contentHtml = this.renderBusinessTab();
    }

    this.container.innerHTML = `
      <div class="bank-card">
        <div class="bank-card__header">
          <div class="bank-card__title-area">
            <div class="bank-card__title">🏛️ Beginners Village Bank & Treasury</div>
            <div class="bank-card__subtitle">Secure Vault, Savings Interest & Municipal Investments</div>
          </div>
          <button class="bank-card__close" id="bank-close-btn">&times;</button>
        </div>
        ${tabsHtml}
        <div class="bank-content">
          <div class="bank-summary-grid">
            <div class="bank-summary-box">
              <span class="bank-summary-box__label">Carried Purse Gold</span>
              <span class="bank-summary-box__val bank-summary-box__val--gold">🪙 ${purseGold.toLocaleString()} G</span>
            </div>
            <div class="bank-summary-box">
              <span class="bank-summary-box__label">Bank Savings Balance</span>
              <span class="bank-summary-box__val bank-summary-box__val--gold">🏦 ${savingsBalance.toLocaleString()} G</span>
            </div>
          </div>
          ${feedbackHtml}
          ${contentHtml}
        </div>
        <div class="bank-card__footer">
          <span>Max Savings Vault: ${config.maxSavingsLimit.toLocaleString()} G</span>
          <span>Interest Rate: ${(config.interestRatePerInterval * 100).toFixed(0)}% per interval</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSavingsTab(purseGold: number, savingsBalance: number, interestRate: number): string {
    return `
      <div class="bank-action-panel">
        <div class="bank-action-panel__title">📥 Deposit Gold into Savings</div>
        <div class="bank-input-row">
          <input type="number" id="bank-deposit-input" class="bank-input" placeholder="Amount to deposit" min="1" max="${purseGold}" />
          <button class="bank-btn bank-btn--primary" id="bank-deposit-btn">Deposit</button>
        </div>
        <div class="bank-presets">
          <button class="bank-preset-btn" data-preset-deposit="10">+10</button>
          <button class="bank-preset-btn" data-preset-deposit="50">+50</button>
          <button class="bank-preset-btn" data-preset-deposit="100">+100</button>
          <button class="bank-preset-btn" data-preset-deposit="${purseGold}">All (${purseGold})</button>
        </div>
      </div>

      <div class="bank-action-panel">
        <div class="bank-action-panel__title">📤 Withdraw Gold from Savings</div>
        <div class="bank-input-row">
          <input type="number" id="bank-withdraw-input" class="bank-input" placeholder="Amount to withdraw" min="1" max="${savingsBalance}" />
          <button class="bank-btn bank-btn--secondary" id="bank-withdraw-btn">Withdraw</button>
        </div>
        <div class="bank-presets">
          <button class="bank-preset-btn" data-preset-withdraw="10">+10</button>
          <button class="bank-preset-btn" data-preset-withdraw="50">+50</button>
          <button class="bank-preset-btn" data-preset-withdraw="100">+100</button>
          <button class="bank-preset-btn" data-preset-withdraw="${savingsBalance}">All (${savingsBalance})</button>
        </div>
      </div>

      <div class="bank-card-item">
        <div class="bank-card-item__info">
          <div class="bank-card-item__name">📈 Compound Interest Accrual</div>
          <div class="bank-card-item__desc">Your savings automatically accrue ${(interestRate * 100).toFixed(0)}% compound interest periodically while you explore and study.</div>
        </div>
        <div class="bank-card-item__actions">
          <button class="bank-btn bank-btn--success" id="bank-claim-interest-btn">Collect Interest</button>
        </div>
      </div>
    `;
  }

  private renderInvestmentsTab(): string {
    const activeInvestments = this.bank.getActiveInvestments();
    const activeMap = new Map<string, InvestmentOpportunity>(activeInvestments.map((inv) => [inv.id, inv]));
    const now = Date.now();

    const itemsHtml = AVAILABLE_INVESTMENTS.map((opp) => {
      const active = activeMap.get(opp.id);
      let actionBtn = '';

      if (!active) {
        actionBtn = `
          <button class="bank-btn bank-btn--primary" data-invest-id="${opp.id}" data-cost="${opp.cost}">
            Fund (${opp.cost} G)
          </button>
        `;
      } else {
        const elapsed = now - (active.startedAt || now);
        const remainingMs = Math.max(0, active.durationMs - elapsed);
        const isReady = remainingMs <= 0;

        if (isReady) {
          const payout = Math.floor(active.cost * (1 + active.expectedReturnRate));
          actionBtn = `
            <button class="bank-btn bank-btn--success" data-claim-invest-id="${opp.id}">
              Claim (${payout} G)
            </button>
          `;
        } else {
          const secondsLeft = Math.ceil(remainingMs / 1000);
          actionBtn = `
            <button class="bank-btn bank-btn--secondary bank-btn--disabled" disabled>
              ⏳ ${secondsLeft}s left
            </button>
          `;
        }
      }

      const returnPercent = (opp.expectedReturnRate * 100).toFixed(0);
      const estPayout = Math.floor(opp.cost * (1 + opp.expectedReturnRate));

      return `
        <div class="bank-card-item">
          <div class="bank-card-item__info">
            <div class="bank-card-item__name">📊 ${this.escape(opp.name)}</div>
            <div class="bank-card-item__desc">${this.escape(opp.description)}</div>
            <div class="bank-card-item__meta">Cost: ${opp.cost} G | Return: +${returnPercent}% (${estPayout} G) | Duration: ${Math.round(opp.durationMs / 1000)}s</div>
          </div>
          <div class="bank-card-item__actions">
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bank-list">
        ${itemsHtml}
      </div>
    `;
  }

  private renderBusinessTab(): string {
    const businesses = this.bank.getAllBusinesses();

    if (businesses.length === 0) {
      return `<div class="bank-card-item__desc">No active enterprises registered in this municipality.</div>`;
    }

    const itemsHtml = businesses.map((biz) => {
      const netProfit = this.bank.calculateDailyNetProfit(biz.id);
      return `
        <div class="bank-card-item">
          <div class="bank-card-item__info">
            <div class="bank-card-item__name">🏪 ${this.escape(biz.name)} (Tier ${biz.level})</div>
            <div class="bank-card-item__desc">Sector: ${biz.type} | Staff: ${biz.employees} employees</div>
            <div class="bank-card-item__meta">Daily Gross: ${biz.dailyRevenue} G | Overhead: ${biz.dailyExpenses} G | Net Margin: +${netProfit} G / cycle</div>
          </div>
          <div class="bank-card-item__actions">
            <button class="bank-btn bank-btn--secondary bank-btn--disabled" disabled>Active</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bank-list">
        ${itemsHtml}
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Close button
    this.container.querySelector('#bank-close-btn')?.addEventListener('click', () => {
      this.destroy();
      this.onClose?.();
    });

    // Tab buttons
    this.container.querySelectorAll('.bank-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as BankTab;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.feedbackMessage = '';
          this.render();
        }
      });
    });

    // Deposit presets
    this.container.querySelectorAll('[data-preset-deposit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-preset-deposit');
        const input = this.container?.querySelector('#bank-deposit-input') as HTMLInputElement;
        if (input && val) input.value = val;
      });
    });

    // Withdraw presets
    this.container.querySelectorAll('[data-preset-withdraw]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-preset-withdraw');
        const input = this.container?.querySelector('#bank-withdraw-input') as HTMLInputElement;
        if (input && val) input.value = val;
      });
    });

    // Deposit action
    this.container.querySelector('#bank-deposit-btn')?.addEventListener('click', () => {
      const input = this.container?.querySelector('#bank-deposit-input') as HTMLInputElement;
      const amount = parseInt(input?.value || '0', 10);
      if (isNaN(amount) || amount <= 0) {
        this.feedbackMessage = 'Please enter a valid positive deposit amount.';
        this.feedbackIsError = true;
        this.render();
        return;
      }

      const success = this.bank.deposit(amount);
      if (success) {
        this.feedbackMessage = `Successfully deposited ${amount} Gold into savings vault.`;
        this.feedbackIsError = false;
        this.onTransactionComplete?.();
      } else {
        this.feedbackMessage = 'Failed to deposit gold. Check your purse funds and vault capacity.';
        this.feedbackIsError = true;
      }
      this.render();
    });

    // Withdraw action
    this.container.querySelector('#bank-withdraw-btn')?.addEventListener('click', () => {
      const input = this.container?.querySelector('#bank-withdraw-input') as HTMLInputElement;
      const amount = parseInt(input?.value || '0', 10);
      if (isNaN(amount) || amount <= 0) {
        this.feedbackMessage = 'Please enter a valid positive withdrawal amount.';
        this.feedbackIsError = true;
        this.render();
        return;
      }

      const success = this.bank.withdraw(amount);
      if (success) {
        this.feedbackMessage = `Successfully withdrew ${amount} Gold from savings vault.`;
        this.feedbackIsError = false;
        this.onTransactionComplete?.();
      } else {
        this.feedbackMessage = 'Failed to withdraw gold. Insufficient savings balance.';
        this.feedbackIsError = true;
      }
      this.render();
    });

    // Collect interest action
    this.container.querySelector('#bank-claim-interest-btn')?.addEventListener('click', () => {
      const interest = this.bank.applyInterest();
      if (interest > 0) {
        this.feedbackMessage = `Collected ${interest} Gold in compound interest!`;
        this.feedbackIsError = false;
        this.onTransactionComplete?.();
      } else {
        this.feedbackMessage = 'No interest accrued yet. Keep funds saved over time to earn yield.';
        this.feedbackIsError = false;
      }
      this.render();
    });

    // Start investment actions
    this.container.querySelectorAll('[data-invest-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-invest-id');
        const opp = AVAILABLE_INVESTMENTS.find((i) => i.id === id);
        if (!opp) return;

        const success = this.bank.startInvestment(opp);
        if (success) {
          this.feedbackMessage = `Funded "${opp.name}" for ${opp.cost} Gold!`;
          this.feedbackIsError = false;
          this.onTransactionComplete?.();
        } else {
          this.feedbackMessage = `Insufficient gold in purse to fund "${opp.name}". Needed: ${opp.cost} G.`;
          this.feedbackIsError = true;
        }
        this.render();
      });
    });

    // Claim investment actions
    this.container.querySelectorAll('[data-claim-invest-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-claim-invest-id');
        if (!id) return;

        const res = this.bank.claimInvestment(id);
        if (res.success) {
          this.feedbackMessage = `Venture matured! Claimed payout of ${res.payout} Gold!`;
          this.feedbackIsError = false;
          this.onTransactionComplete?.();
        } else {
          this.feedbackMessage = 'Investment is still active. Please wait for maturation.';
          this.feedbackIsError = true;
        }
        this.render();
      });
    });
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
