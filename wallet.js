$(document).ready(function () {
    const defaultDerivationPath = "m/44'/60'/0'/0/0";
    const derivationPath = "m/44'/60'/0'/0/";
    const HDNode = ethers.HDNode;
    const provider = ethers.providers.getDefaultProvider('ropsten');
    const utils = ethers.utils;
    let index = 0;
    let wallets = {};
    showView("viewHome");

    $('#linkHome').click(function () {
        showView("viewHome");
    });

    $('#linkCreateNewWallet').click(function () {
        showView("viewCreateNewWallet");
    });
    $('#linkImportExistingWalletFromMnemonic').click(function () {
        $('#textareaOpenWallet').empty();
        $('#textareaOpenWallet').text('toddler online monitor oblige solid enrich cycle animal mad prevent hockey motor');
        showView("viewOpenExistingWallet");
    });
    $('#linkShowMnemonic').click(function () {
        showView("viewShowMnemonic");
    });

    $('#linkViewBalances').click(function () {
        index = 0;
        $('#showAddresses').empty();
        showView("viewBalances");
    });
    $('#linkSendTransaction').click(function () {
        $('#senderAddress').empty();
        showView("viewSendTransaction");
    });

    $('#buttonGenerateNewWallet').click(generateNewWallet);
    $('#buttonOpenExistingWallet').click(openExistingWallet);
    $('#buttonShowMnemonic').click(showMnemonic);
    $('#buttonViewAddresses').click(showBalances);
    $('#buttonSendAddresses').click(showAddresses);
    $('#buttonSignTransaction').click(signTransaction);
    $('#buttonSendSignedTransaction').click(sendSignedTransaction);

    $('#linkLogout').click(logout);

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();

        if (sessionStorage.HDNode) {
            //Logged in -> show user panel and links
            $('#linkShowMnemonic').show();
            $('#linkViewBalances').show();
            $('#linkSendTransaction').show();
            $('#linkLogout').show();
        }
        else {
            //Not logged in -> hide user panel and links
            $('#linkShowMnemonic').hide();
            $('#linkViewBalances').hide();
            $('#linkSendTransaction').hide();
            $('#linkLogout').hide();
        }
    }

    function showInfo(message) {
        $('#infoBox>p').html(message);
        $('#infoBox').show();
        $('#infoBox>header').click(function () {
            $('#infoBox').hide();
        })
    }

    function showError(errorMsg) {
        $('#errorBox>p').html('Error: ' + errorMsg);
        $('#errorBox').show();
        $('#errorBox>header').click(function () {
            $('#errorBox').hide();
        })
    }

    function showLoading(percent) {
        $('#loadingBox').html("Loading... " + parseInt(percent * 100) + "% complete");
        $('#loadingBox').show();
        $('#loadingBox>header').click(function () {
            $('#errorBox').hide();
        })
    }

    function generateNewWallet() {
        let password = $('#createWalletPassword').val();
        let randomEntropyBytes = utils.randomBytes(16);
        let mnemonic = HDNode.entropyToMnemonic(randomEntropyBytes);

        encrypt(mnemonic, password);
    }

    function encrypt(mnemonic, password) {
        let entropy = HDNode.mnemonicToEntropy(mnemonic);
        let privateKey = HDNode.fromMnemonic(mnemonic).derivePath(defaultDerivationPath).privateKey;

        // Clarify you are encrypting a mnemonic
        let options = {
            entropy: entropy
        };

        secretStorage.encrypt(privateKey, password, options, (progress) => {
            showLoading(progress)
        })
            .then(json => {
                $('#loadingBox').hide();
                sessionStorage['HDNode'] = json;
                $('#textareaCreateWalletResult').text('JSON: ' + sessionStorage.HDNode);
                showInfo('PLEASE SAVE YOUR MNEMONIC: ' + mnemonic);
                showLoggedInButtons();
            });
    }

    function openExistingWallet() {
        let mnemonic = $('#textareaOpenWallet').val();
        if (!HDNode.isValidMnemonic(mnemonic)) {
            return showError('Invalid mnemonic!')
        }
        let password = $('#openWalletPassword').val();

        let entropy = HDNode.mnemonicToEntropy(mnemonic);
        let privateKey = HDNode.fromMnemonic(mnemonic).derivePath(defaultDerivationPath).privateKey;

        // Clarify you are encrypting a mnemonic
        let options = {
            entropy: entropy
        };

        secretStorage.encrypt(privateKey, password, options, (progress) => {
            showLoading(progress)
        }).then(json => {
            $('#loadingBox').hide();
            sessionStorage['HDNode'] = json;
            showInfo('Wallet successfully loaded!');
            showLoggedInButtons();
        });
    }

    function showLoggedInButtons() {
        $('#linkShowMnemonic').show();
        $('#linkViewBalances').show();
        $('#linkSendTransaction').show();
        $('#linkLogout').show();
    }

    function showMnemonic() {
        let password = $('#showMnemonicPassword').val();
        let json = sessionStorage.HDNode;
        secretStorage.decrypt(json, password, (progress) => {
            showLoading(progress)
        })
            .then(signingKey => {
                $('#loadingBox').hide();
                showInfo("Your mnemonic is: " + signingKey.mnemonic);
                console.log(signingKey);
            })
            .catch(err => {
                showError(err);
            })

    }

    function showBalances() {
        let password = $('#viewBalancesPassword').val();
        let json = sessionStorage.HDNode;
        secretStorage.decrypt(json, password, (progress) => {
            showLoading(progress)
        })
            .then(signingKey => {
                $('#loadingBox').hide();
                let masterNode = HDNode.fromMnemonic(signingKey.mnemonic);
                for (let i = index; i < index + 5; i++) {
                    let div = $('<div id="qrcode">');
                    let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);
                    wallet.getBalance().then((balance) => {
                        div.append($(`<p>${wallet.address}: ${utils.formatEther(balance)} ETH</p>`));
                        $('#showAddresses').append(div);
                    })
                        .catch(err => {
                            showError(err);
                        });
                }
                index += 5;
            })
            .catch(err => {
                $('#loadingBox').hide();
                showError(err);
            })
    }

    function showAddresses() {
        let password = $('#viewBalancesPassword').val();
        let json = sessionStorage.HDNode;
        secretStorage.decrypt(json, password, (progress) => {
            showLoading(progress)
        })
            .then(signingKey => {
                $('#loadingBox').hide();
                let masterNode = HDNode.fromMnemonic(signingKey.mnemonic);
                for (let i = index; i < index + 5; i++) {
                    let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);
                    let address = wallet.address;

                    wallets[address] = wallet;
                    let option = $(`<option id=${wallet.address}>`).text(address);
                    $('#senderAddress').append(option);
                }
                index += 5;
            })
            .catch(err => {
                $('#loadingBox').hide();
                showError(err);
            })
    }

    function signTransaction() {
        let address = $('#senderAddress option:selected').attr('id');
        let wallet = wallets[address];
        if (!wallet) {
            showError("Invalid address!")
        }
        let recipient = $('#recipientAddress').val();
        if (!recipient)
            return showError("Add recipient");

        let value = $('#transferValue').val();
        if (!value)
            return showError("Add value!");
        let transactionCount = wallet.getTransactionCount()
            .then(nonce => {
                console.log(nonce);
                let transaction = {
                    nonce: nonce,
                    gasLimit: 21000,
                    gasPrice: utils.bigNumberify("20000000000"),

                    to: recipient,

                    value: utils.parseEther(value.toString()),
                    data: "0x",

                    // This ensures the transaction cannot be replayed on different networks
                    //ethers.providers.Provider.chainId.ropsten ?
                    chainId: 3
                };
                console.log(transaction);
                let signedTransaction = wallet.sign(transaction);
                $('#textareaSignedTransaction').val(signedTransaction);
            })
            .catch(err => {
                showError(err);
            });
    }

    function sendSignedTransaction() {
        let signedTransaction = $('#textareaSignedTransaction').val();
        provider.sendTransaction(signedTransaction).then(hash => {
            showInfo("Transaction hash:" + hash);
        })
            .catch(err => {
                showError(err);
            });
    }

    function logout() {
        sessionStorage.clear();
        showView('viewHome');
    }
});
//browserify ./node_modules/ethers/wallet/secret-storage.js --s secretStorage > secretStorage.js