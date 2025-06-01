const contractAddress = "0xBC1AD346FF480b962f59322aa00E0985c3B8057a";
    let contractABI;
    let web3;
    let votingContract;
    let currentAccount;

    async function loadABI() {
      try {
        const response = await fetch('../build/contracts/Voting.json');
        contractABI = await response.json();
      } catch (error) {
        console.error('Failed to load ABI:', error);
        showNotification('Failed to load contract ABI', 'error');
      }
    }

    async function connectMetaMask() {
      const connectBtn = document.getElementById('connectBtn');
      const statusIndicator = document.getElementById('statusIndicator');
      const accountElement = document.getElementById('account');

      try {
        if (!window.ethereum) {
          showNotification('MetaMask not detected! Please install MetaMask.', 'error');
          return;
        }

        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        currentAccount = accounts[0];

        // Update UI
        accountElement.textContent = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
        statusIndicator.classList.add('connected');
        connectBtn.textContent = 'Connected';
        connectBtn.style.background = '#28a745';

        // Load contract
        if (!contractABI) await loadABI();
        if (contractABI) {
          votingContract = new web3.eth.Contract(contractABI.abi, contractAddress);
          await loadCandidates();
          showNotification('Successfully connected to MetaMask!', 'success');
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());

      } catch (error) {
        console.error('Connection failed:', error);
        showNotification('Failed to connect to MetaMask', 'error');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect MetaMask';
      }
    }

    function handleAccountsChanged(accounts) {
      if (accounts.length === 0) {
        // User disconnected
        location.reload();
      } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        document.getElementById('account').textContent = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
        loadCandidates();
      }
    }

    async function loadCandidates() {
      const loadingElement = document.getElementById('loading');
      const candidatesElement = document.getElementById('candidates');
      const emptyStateElement = document.getElementById('emptyState');

      try {
        loadingElement.style.display = 'block';
        candidatesElement.innerHTML = '';
        emptyStateElement.style.display = 'none';

        const count = await votingContract.methods.candidatesCount().call();
        
        if (count == 0) {
          loadingElement.style.display = 'none';
          emptyStateElement.style.display = 'block';
          return;
        }

        for (let i = 1; i <= count; i++) {
          const candidate = await votingContract.methods.candidates(i).call();
          
          const candidateCard = document.createElement('div');
          candidateCard.className = 'candidate-card';
          candidateCard.innerHTML = `
            <div class="candidate-info">
              <div class="candidate-name">${candidate.name}</div>
              <div class="vote-count">${candidate.voteCount} votes</div>
            </div>
            <button class="vote-btn" onclick="vote(${i})" id="voteBtn${i}">
              Cast Vote
            </button>
          `;
          
          candidatesElement.appendChild(candidateCard);
        }

        loadingElement.style.display = 'none';

      } catch (error) {
        console.error('Failed to load candidates:', error);
        showNotification('Failed to load candidates', 'error');
        loadingElement.style.display = 'none';
        emptyStateElement.style.display = 'block';
      }
    }

    async function vote(candidateId) {
      const voteBtn = document.getElementById(`voteBtn${candidateId}`);
      
      try {
        voteBtn.disabled = true;
        voteBtn.textContent = 'Voting...';

        await votingContract.methods.vote(candidateId).send({ from: currentAccount });
        
        showNotification('Vote cast successfully!', 'success');
        await loadCandidates(); // Reload to show updated vote counts

      } catch (error) {
        console.error('Vote failed:', error);
        
        if (error.message.includes('revert')) {
          showNotification('You have already voted!', 'error');
        } else {
          showNotification('Transaction failed. Please try again.', 'error');
        }
        
        voteBtn.disabled = false;
        voteBtn.textContent = 'Cast Vote';
      }
    }

    function showNotification(message, type) {
      const notification = document.getElementById('notification');
      notification.textContent = message;
      notification.className = `notification ${type}`;
      notification.classList.add('show');

      setTimeout(() => {
        notification.classList.remove('show');
      }, 4000);
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      // Check if already connected
      if (window.ethereum && window.ethereum.selectedAddress) {
        connectMetaMask();
      }
    });