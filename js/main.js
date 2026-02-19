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
            :disabled="isLocked && columnIndex === 0"
          >
          <span :class="{ 'completed': item.completed }">
            {{ item.text }}
          </span>
        </li>
      </ul>
      
      <div class="card-info">
        <p>Completion: {{ completionPercentage }}%</p>
        <p v-if="cardData.completedAt" class="completed-date">
          Completed: {{ cardData.completedAt }}
        </p>
      </div>
      
      <div class="card-actions" v-if="!isLocked || columnIndex !== 0">
        <button 
          v-if="columnIndex === 0 && canAddItems"
          @click="$emit('add-item', cardData.id)"
          :disabled="cardData.items.length >= 5"
        >
          Add Item
        </button>
        <button 
          v-if="columnIndex < 2"
          @click="$emit('move-card', cardData.id, columnIndex)"
        >
          Move to {{ columnIndex === 0 ? 'Progress' : 'Done' }}
        </button>
        <button 
          v-if="columnIndex === 0"
          @click="$emit('delete-card', cardData.id)"
        >
          Delete
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
      this.$emit('update-item', this.cardData, this.columnIndex, itemIndex);
    }
  },

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
      <p class="card-count">Cards: {{ cards.length }}{{ maxCards ? '/' + maxCards : '' }}</p>
      
      <div v-if="isLocked" class="lock-message">Column locked - wait for Progress column</div>
      
      <div v-if="cards.length === 0" class="no-cards">No cards yet</div>
      
      <card
        v-for="card in cards"
        :key="card.id"
        :card-data="card"
        :column-index="columnIndex"
        :is-locked="isLocked"
        @add-item="$emit('add-card', $event, columnIndex)"
        @move-card="$emit('move-card', $event, columnIndex)"
        @update-item="$emit('update-item', $event, columnIndex, $event)"
        @delete-card="$emit('delete-card', $event)"
      ></card>
      
      <button 
        v-if="!isLocked && (!maxCards || cards.length < maxCards)"
        @click="$emit('add-card', null, columnIndex)"
        class="add-card-btn"
      >
        + Add Card
      </button>
      
      <p v-if="maxCards && cards.length >= maxCards" class="max-reached">
        Maximum cards reached
      </p>
    </div>
  `
});

let app = new Vue({
  el: '#app',
  data: {
    columns: [
      [], // To Do
      [], // In Progress
      []  // Done
    ],
    nextCardId: 1,
    nextItemId: 1
  },

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
        if (percentage > 50) {
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
        const title = prompt('Enter card title:');
        if (!title) return;
        
        const items = [];
        for (let i = 0; i < 3; i++) {
          const itemText = prompt(`Enter item ${i + 1} (min 3 items):`);
          if (itemText) {
            items.push({
              id: this.nextItemId++,
              text: itemText,
              completed: false
            });
          }
        }
        
        if (items.length < 3) {
          alert('Card must have at least 3 items!');
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
          alert('Maximum 5 items per card!');
          return;
        }
        
        const itemText = prompt('Enter new item:');
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
      if (confirm('Are you sure you want to delete ALL cards? This cannot be undone!')) {
      this.columns = [[], [], []]; 
      this.nextCardId = 1; 
      this.nextItemId = 1;
      this.saveToLocalStorage(); 
       }
    },
    
    handleMoveCard(cardId, fromColumnIndex) {
      const cardIndex = this.columns[fromColumnIndex].findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;
      
      const card = this.columns[fromColumnIndex][cardIndex];
      const percentage = this.getCompletionPercentage(card);
      
      if (fromColumnIndex === 0) {
        if (percentage > 50 && percentage < 100) {
          if (this.columns[1].length >= 5) {
            alert('Second column is full! Cannot move card.');
            return;
          }
          this.columns[1].push(card);
          this.columns[0].splice(cardIndex, 1);
        } else if (percentage === 100) {
          card.completedAt = this.getCurrentDateTime();
          this.columns[2].push(card);
          this.columns[0].splice(cardIndex, 1);
        } else {
          alert('Complete more than 50% to move to second column!');
          return;
        }
      } else if (fromColumnIndex === 1) {
        if (percentage === 100) {
          card.completedAt = this.getCurrentDateTime();
          this.columns[2].push(card);
          this.columns[1].splice(cardIndex, 1);
        } else {
          alert('Complete 100% to move to Done column!');
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
        } else if (percentage > 50) {
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
      if (!confirm('Delete this card?')) return;
      
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
    this.loadFromLocalStorage();
  }
});