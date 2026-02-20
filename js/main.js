let eventBus = new Vue();
Vue.component('card', {
  props: {
    cardData: {
      type: Object,
      required: true
    },
    columnIndex: {
      type: Number,
      required: true
    },
    isLocked: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  template: `
    <div class="card" :class="{ 'locked': isLocked && columnIndex === 0 }">
      <h3>{{ cardData.title }}</h3>
      
      <ul class="checklist">
        <li v-for="(item, index) in cardData.items" :key="item.id">
          <input 
            type="checkbox" 
            v-model="item.completed"
            @change="onItemChange(index)"
            :disabled="(isLocked && columnIndex === 0) || columnIndex === 2"
          >
          <span :class="{ 'completed': item.completed }">
            {{ item.text }}
          </span>
        </li>
      </ul>
      
      <div class="card-info">
        <p>Завершение: {{ completionPercentage }}%</p>
        <p v-if="cardData.completedAt" class="completed-date">
          Завершено: {{ cardData.completedAt }}
        </p>
      </div>
      
      <div class="card-actions" v-if="!isLocked || columnIndex !== 0">
        <button 
          v-if="columnIndex === 0 && canAddItems"
          @click="addItem"
          :disabled="cardData.items.length >= 5"
        >
          Добавить элемент
        </button>
        <button 
          v-if="columnIndex < 2"
          @click="moveCard"
        >
          Переместить в {{ columnIndex === 0 ? 'В процессе' : 'Готово' }}
        </button>
        <button 
          v-if="columnIndex === 0"
          @click="deleteCard"
        >
          Удалить
        </button>
      </div>
    </div>
  `,
  computed: {
    completionPercentage() {
      if (this.cardData.items.length === 0) return 0;
      const completed = this.cardData.items.filter(item => item.completed).length;
      return Math.round((completed / this.cardData.items.length) * 100);
    },
    canAddItems() {
      return this.cardData.items.length < 5;
    }
  },
  methods: {
    onItemChange(itemIndex) {
      eventBus.$emit('update-item', this.cardData, this.columnIndex, itemIndex);
    },
    addItem() {
      eventBus.$emit('add-item', this.cardData.id, this.columnIndex);
    },
    moveCard() {
      eventBus.$emit('move-card', this.cardData.id, this.columnIndex);
    },
    deleteCard() {
      eventBus.$emit('delete-card', this.cardData.id);
    }
  }
});

Vue.component('column', {
  props: {
    title: {
      type: String,
      required: true
    },
    cards: {
      type: Array,
      required: true
    },
    maxCards: {
      type: Number,
      required: false
    },
    isLocked: {
      type: Boolean,
      required: true
    },
    columnIndex: {
      type: Number,
      required: true
    }
  },
  template: `
    <div class="column" :class="{ 'locked': isLocked }">
      <h2>{{ title }}</h2>
      <p class="card-count">Карточки: {{ cards.length }}{{ maxCards ? '/' + maxCards : '' }}</p>
      
      <div v-if="isLocked" class="lock-message">Столбец заблокирован — дождитесь столбца «В процессе»</div>
      
      <div v-if="cards.length === 0" class="no-cards">Пока нет карточек</div>
      
      <card
        v-for="card in cards"
        :key="card.id"
        :card-data="card"
        :column-index="columnIndex"
        :is-locked="isLocked">
      </card>
      
      <button 
        v-if="columnIndex === 0 && !isLocked && (!maxCards || cards.length < maxCards)"
        @click="addCard"
        class="add-card-btn"
        >
        + Добавить карточку
      </button>
      
      <p v-if="maxCards && cards.length >= maxCards" class="max-reached">
        Достигнуто максимальное количество карточек
      </p>
    </div>
  `,
  methods: {
    addCard() {
      eventBus.$emit('add-card', null, this.columnIndex);
    }
  }
});

let app = new Vue({
  el: '#app',
   data: {
    columns: [
      [], // Нужно сделать
      [], // В процессе
      []  // Готово
    ],
    nextCardId: 1,
    nextItemId: 1
  },

  template: `
    <div>
      <h1>Заметочки</h1>
      
      <div class="columns">
        <column 
          :title="'Нужно сделать'" 
          :cards="columns[0]" 
          :max-cards="3"
          :is-locked="isFirstColumnLocked"
          :column-index="0">
        </column>
        
        <column 
          :title="'В процессе'" 
          :cards="columns[1]" 
          :max-cards="5"
          :is-locked="false"
          :column-index="1">
        </column>
        
        <column 
          :title="'Готово'" 
          :cards="columns[2]" 
          :max-cards="null"
          :is-locked="false"
          :column-index="2">
        </column>
      </div>
      
      <button @click="cleanAll" class="clean-all-btn">
        Очистить «Готово»
      </button>
    </div>
  `,

  computed: {
    isFirstColumnLocked() {
      const secondColumn = this.columns[1];
      const maxCards = 5;
      
      if (secondColumn.length < maxCards) {
        return false;
      }
      
      const firstColumn = this.columns[0];
      for (let card of firstColumn) {
        const percentage = this.getCompletionPercentage(card);
        if (percentage >= 50) {
          return true;
        }
      }
      
      return false;
    }
  },
  methods: {
    getCompletionPercentage(card) {
      if (!card.items || card.items.length === 0) return 0;
      const completed = card.items.filter(item => item.completed).length;
      return Math.round((completed / card.items.length) * 100);
    },
    
    handleAddCard(cardId, columnIndex) {
      if (cardId === null) {
        const title = prompt('Введите заголовок карточки:');
        if (!title) return;
        
        const items = [];
        for (let i = 0; i < 3; i++) {
          const itemText = prompt(`Введите элемент ${i + 1} (минимум 3 элемента):`);
          if (itemText) {
            items.push({
              id: this.nextItemId++,
              text: itemText,
              completed: false
            });
          }
        }
        
        if (items.length < 3) {
          alert('Карточка должна содержать минимум 3 элемента!');
          return;
        }
        
        const newCard = {
          id: this.nextCardId++,
          title: title,
          items: items,
          completedAt: null
        };
        
        this.columns[columnIndex].push(newCard);
        this.saveToLocalStorage();
      } else {
        const card = this.columns[columnIndex].find(c => c.id === cardId);
        if (!card) return;
        
        if (card.items.length >= 5) {
          alert('Максимум 5 элементов в карточке!');
          return;
        }
        
        const itemText = prompt('Введите новый элемент:');
        if (itemText) {
          card.items.push({
            id: this.nextItemId++,
            text: itemText,
            completed: false
          });
          this.saveToLocalStorage();
        }
      }
    },
    
    cleanAll() {
      if (confirm('Вы уверены, что хотите удалить все карточки из столбца «Готово»? Это действие нельзя отменить!')) {
      this.columns[2] = []; 
      this.saveToLocalStorage();
     }
    },
    
    handleMoveCard(cardId, fromColumnIndex) {
      const cardIndex = this.columns[fromColumnIndex].findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;
      
      const card = this.columns[fromColumnIndex][cardIndex];
      const percentage = this.getCompletionPercentage(card);
      
      if (fromColumnIndex === 0) {
        if (percentage >= 50 && percentage < 100) {
          if (this.columns[1].length >= 5) {
            alert('Второй столбец заполнен! Невозможно переместить карточку.');
            return;
          }
          this.columns[1].push(card);
          this.columns[0].splice(cardIndex, 1);
        } else if (percentage === 100) {
          card.completedAt = this.getCurrentDateTime();
          this.columns[2].push(card);
          this.columns[0].splice(cardIndex, 1);
        } else {
          alert('Завершите более 50%, чтобы переместить во второй столбец!');
          return;
        }
      } else if (fromColumnIndex === 1) {
        if (percentage === 100) {
          card.completedAt = this.getCurrentDateTime();
          this.columns[2].push(card);
          this.columns[1].splice(cardIndex, 1);
        } else {
          alert('Завершите на 100%, чтобы переместить в столбец «Готово»!');
          return;
        }
      }
      
      this.saveToLocalStorage();
    },
    
    handleItemUpdate(cardData, columnIndex, itemIndex) {
      const card = this.columns[columnIndex].find(c => c.id === cardData.id);
      if (!card) return;

      const percentage = this.getCompletionPercentage(card);
      
      if (columnIndex === 0) {
        if (percentage === 100) {
          card.completedAt = this.getCurrentDateTime();
          setTimeout(() => {
            this.handleMoveCard(cardData.id, 0);
          }, 500);
        } else if (percentage >= 50) {
          if (this.columns[1].length < 5) {
            setTimeout(() => {
              this.handleMoveCard(cardData.id, 0);
            }, 500);
          }
        }
      } else if (columnIndex === 1 && percentage === 100) {
        card.completedAt = this.getCurrentDateTime();
        setTimeout(() => {
          this.handleMoveCard(cardData.id, 1);
        }, 500);
      }
      
      this.saveToLocalStorage();
    },
    
    handleDeleteCard(cardId) {
      if (!confirm('Удалить эту карточку?')) return;
      
      const columnIndex = this.columns.findIndex(col => 
        col.some(c => c.id === cardId)
      );
      
      if (columnIndex !== -1) {
        const cardIndex = this.columns[columnIndex].findIndex(c => c.id === cardId);
        this.columns[columnIndex].splice(cardIndex, 1);
        this.saveToLocalStorage();
      }
    },
    
    getCurrentDateTime() {
      const now = new Date();
      return now.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },
    
    saveToLocalStorage() {
      localStorage.setItem('notesApp_columns', JSON.stringify(this.columns));
      localStorage.setItem('notesApp_nextCardId', this.nextCardId);
      localStorage.setItem('notesApp_nextItemId', this.nextItemId);
    },
    
    loadFromLocalStorage() {
      const savedColumns = localStorage.getItem('notesApp_columns');
      const savedNextCardId = localStorage.getItem('notesApp_nextCardId');
      const savedNextItemId = localStorage.getItem('notesApp_nextItemId');
      
      if (savedColumns) {
        this.columns = JSON.parse(savedColumns);
      }
      
      if (savedNextCardId) {
        this.nextCardId = parseInt(savedNextCardId);
      }
      
      if (savedNextItemId) {
        this.nextItemId = parseInt(savedNextItemId);
      }
    }
  },
  mounted() {
    eventBus.$on('add-card', (cardId, columnIndex) => {
      this.handleAddCard(cardId, columnIndex);
    });
    
    eventBus.$on('move-card', (cardId, columnIndex) => {
      this.handleMoveCard(cardId, columnIndex);
    });
    
    eventBus.$on('update-item', (cardData, columnIndex, itemIndex) => {
      this.handleItemUpdate(cardData, columnIndex, itemIndex);
    });
    
    eventBus.$on('delete-card', (cardId) => {
      this.handleDeleteCard(cardId);
    });
    
    eventBus.$on('add-item', (cardId, columnIndex) => {
      this.handleAddCard(cardId, columnIndex);
    });
    
    this.loadFromLocalStorage();
  }
});