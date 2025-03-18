class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    getDisplayValue() {
        if (this.value === 1) return 'A';
        if (this.value > 10) {
            return ['J', 'Q', 'K'][this.value - 11];
        }
        return this.value.toString();
    }

    getSuitSymbol() {
        return ['♠', '♥', '♦', '♣'][['spades', 'hearts', 'diamonds', 'clubs'].indexOf(this.suit)];
    }
}

class Deck {
    constructor() {
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        for (let suit of suits) {
            for (let value = 1; value <= 13; value++) {
                this.cards.push(new Card(suit, value));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}

class BlackjackGame {
    constructor() {
        this.deck = new Deck();
        this.playerHand = [];
        this.dealerHand = [];
        this.bank = 1000;
        this.currentBet = 0;
        this.setupThemeSelector();
        this.setupEventListeners();
        this.updateBankDisplay();
    }

    setupThemeSelector() {
        const themeSelect = document.getElementById('theme-select');
        themeSelect.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-theme', e.target.value);
            localStorage.setItem('blackjack-theme', e.target.value);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('blackjack-theme');
        if (savedTheme) {
            themeSelect.value = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }

    setupEventListeners() {
        // Betting controls
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => this.addBet(parseInt(chip.dataset.value)));
        });
        
        document.getElementById('clear-bet-button').addEventListener('click', () => this.clearBet());
        
        // Game controls
        document.getElementById('deal-button').addEventListener('click', () => this.startNewGame());
        document.getElementById('hit-button').addEventListener('click', () => this.playerHit());
        document.getElementById('stand-button').addEventListener('click', () => this.playerStand());
    }

    addBet(amount) {
        if (this.bank >= amount) {
            this.currentBet += amount;
            this.bank -= amount;
            this.updateBetDisplay();
            this.updateBankDisplay();
            document.getElementById('deal-button').disabled = false;
        }
    }

    clearBet() {
        this.bank += this.currentBet;
        this.currentBet = 0;
        this.updateBetDisplay();
        this.updateBankDisplay();
        document.getElementById('deal-button').disabled = true;
    }

    updateBetDisplay() {
        document.getElementById('bet-amount').textContent = this.currentBet;
    }

    updateBankDisplay() {
        document.getElementById('bank-amount').textContent = this.bank;
    }

    async startNewGame() {
        if (this.currentBet === 0) return;

        this.deck.reset();
        this.playerHand = [];
        this.dealerHand = [];
        this.clearTable();

        // Deal initial cards
        const firstPlayerCard = this.deck.deal();
        const firstDealerCard = this.deck.deal();
        this.playerHand.push(firstPlayerCard);
        this.dealerHand.push(firstDealerCard);
        
        const secondPlayerCard = this.deck.deal();
        const secondDealerCard = this.deck.deal();
        this.playerHand.push(secondPlayerCard);
        this.dealerHand.push(secondDealerCard);

        this.updateTable();
        this.toggleControls(true);

        // Check for blackjack
        if (this.getHandValue(this.playerHand) === 21) {
            await new Promise(resolve => setTimeout(resolve, 500));
            this.playerStand();
        }
    }

    async playerHit() {
        if (this.getHandValue(this.playerHand) >= 21) return;
        
        const card = this.deck.deal();
        this.playerHand.push(card);
        this.updateTable();

        if (this.getHandValue(this.playerHand) > 21) {
            await new Promise(resolve => setTimeout(resolve, 300));
            this.endGame('Bust! Dealer wins!', false);
        } else if (this.getHandValue(this.playerHand) === 21) {
            await new Promise(resolve => setTimeout(resolve, 300));
            this.playerStand();
        }
    }

    async playerStand() {
        this.toggleControls(false);
        
        // Dealer must hit on 16 and stand on 17
        while (this.getHandValue(this.dealerHand) < 17) {
            const card = this.deck.deal();
            this.dealerHand.push(card);
            this.updateTable(true);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.updateTable(true);
        this.determineWinner();
    }

    getHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            if (card.value === 1) {
                aces += 1;
            } else {
                value += Math.min(10, card.value);
            }
        }

        // Handle aces
        for (let i = 0; i < aces; i++) {
            if (value + 11 <= 21) {
                value += 11;
            } else {
                value += 1;
            }
        }

        return value;
    }

    determineWinner() {
        const playerValue = this.getHandValue(this.playerHand);
        const dealerValue = this.getHandValue(this.dealerHand);

        if (playerValue > 21) {
            this.endGame('Bust! Dealer wins!', false);
        } else if (dealerValue > 21) {
            this.endGame('Dealer busts! You win! 🎉', true);
        } else if (playerValue === 21 && this.playerHand.length === 2) {
            // Blackjack pays 3:2
            this.endGame('Blackjack! You win! 🎉', 'blackjack');
        } else if (playerValue > dealerValue) {
            this.endGame('You win! 🎉', true);
        } else if (dealerValue > playerValue) {
            this.endGame('Dealer wins!', false);
        } else {
            this.endGame('Push - it\'s a tie! 🤝', 'push');
        }
    }

    createCardElement(card, hidden = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card dealt';
        
        if (hidden) {
            cardDiv.classList.add('hidden');
            const content = document.createElement('div');
            content.className = 'card-content';
            content.textContent = '?';
            cardDiv.appendChild(content);
            return cardDiv;
        }

        if (card.suit === 'hearts' || card.suit === 'diamonds') {
            cardDiv.classList.add('red');
        }

        // Add corner values
        const topLeft = document.createElement('div');
        topLeft.className = 'card-corner top-left';
        topLeft.innerHTML = `${card.getDisplayValue()}<br>${card.getSuitSymbol()}`;
        
        const bottomRight = document.createElement('div');
        bottomRight.className = 'card-corner bottom-right';
        bottomRight.innerHTML = `${card.getDisplayValue()}<br>${card.getSuitSymbol()}`;

        // Add center value
        const content = document.createElement('div');
        content.className = 'card-content';
        content.textContent = `${card.getSuitSymbol()}`;

        cardDiv.appendChild(topLeft);
        cardDiv.appendChild(content);
        cardDiv.appendChild(bottomRight);

        return cardDiv;
    }

    updateTable(showDealerCards = false) {
        const dealerContainer = document.getElementById('dealer-hand');
        const playerContainer = document.getElementById('player-hand');

        // Clear existing cards
        while (dealerContainer.children.length > 1) {
            dealerContainer.removeChild(dealerContainer.lastChild);
        }
        while (playerContainer.children.length > 1) {
            playerContainer.removeChild(playerContainer.lastChild);
        }

        // Update dealer's cards
        this.dealerHand.forEach((card, index) => {
            const cardElement = this.createCardElement(
                card,
                !showDealerCards && index === 1
            );
            dealerContainer.appendChild(cardElement);
        });

        // Update player's cards
        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card);
            playerContainer.appendChild(cardElement);
        });

        // Update scores
        document.getElementById('dealer-score').textContent = 
            showDealerCards ? this.getHandValue(this.dealerHand) : '?';
        document.getElementById('player-score').textContent = 
            this.getHandValue(this.playerHand);
    }

    toggleControls(enabled) {
        document.getElementById('deal-button').disabled = enabled;
        document.getElementById('hit-button').disabled = !enabled;
        document.getElementById('stand-button').disabled = !enabled;
    }

    clearTable() {
        document.getElementById('message').textContent = '';
        document.getElementById('message').classList.remove('visible');
        document.getElementById('dealer-score').textContent = '0';
        document.getElementById('player-score').textContent = '0';
    }

    endGame(message, result) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.classList.add('visible');
        
        // Handle betting outcomes
        if (result === true) {
            // Regular win pays 1:1
            this.bank += this.currentBet * 2;
        } else if (result === 'blackjack') {
            // Blackjack pays 3:2
            this.bank += this.currentBet * 2.5;
        } else if (result === 'push') {
            // Push returns the bet
            this.bank += this.currentBet;
        }
        // Loss results in no additional bank changes since bet was already deducted
        
        this.currentBet = 0;
        this.updateBetDisplay();
        this.updateBankDisplay();
        
        this.toggleControls(false);
        document.getElementById('clear-bet-button').disabled = false;
    }
}

// Start the game
const game = new BlackjackGame();