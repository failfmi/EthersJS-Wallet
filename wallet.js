$(document).ready(function () {
    const derivationPath = "m/44'/60'/0'/0/";
    const HDNode = ethers.HDNode;
    const provider = ethers.providers.getDefaultProvider('ropsten');
    const utils = ethers.utils;

    let wallets = {};
    showView("viewHome");

    $('#linkHome').click(function () {
        showView("viewHome");
    });

    $('#linkCreateNewWallet').click(function () {
        showView("viewCreateNewWallet");
    });

    $('#linkImportExistingWalletFromMnemonic').click(function () {
        $('#textareaOpenWallet').val('');
        $('#textareaOpenWallet').val('toddler online monitor oblige solid enrich cycle animal mad prevent hockey motor');
        showView("viewOpenWalletFromMnemonic");
    });
    $('#linkImportWalletFromFile').click(function () {
        $('#walletUploadPassword').val('');
        showView("viewOpenWalletFromFile");
    });

    $('#linkShowMnemonic').click(function () {
        $('#showMnemonicPassword').val('');
        showView("viewShowMnemonic");
    });

    $('#linkViewBalances').click(function () {
        $('#viewBalancesPassword').val('');
        $('#renderWallets').empty();
        showView("viewBalances");
    });
    $('#linkSendTransaction').click(function () {
        $('#senderAddress').empty();
        $('#transferValue').val('');
        $('#textareaSignedTransaction').val('');
        showView("viewSendTransaction");
    });

    $('#buttonGenerateNewWallet').click(generateNewWallet);
    $('#buttonOpenExistingWallet').click(openWalletFromMnemonic);
    $('#buttonUploadWallet').click(openWalletFromFile);
    $('#buttonShowMnemonic').click(showMnemonic);
    $('#buttonViewAddresses').click(showAddressesAndBalances);
    $('#buttonSendAddresses').click(unlockWalletAndDeriveAddresses);
    $('#buttonSignTransaction').click(signTransaction);
    $('#buttonSendSignedTransaction').click(sendSignedTransaction);

    $('#linkLogout').click(logout);

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();

        if (sessionStorage.HDNode) {
            $('#linkCreateNewWallet').hide();
            $('#linkImportExistingWalletFromMnemonic').hide();
            $('#linkImportWalletFromFile').hide();
            //Logged in -> show user panel and links
            $('#linkShowMnemonic').show();
            $('#linkViewBalances').show();
            $('#linkSendTransaction').show();
            $('#linkLogout').show();
        }
        else {
            //Not logged in -> hide user panel and links
            $('#linkCreateNewWallet').show();
            $('#linkImportExistingWalletFromMnemonic').show();
            $('#linkImportWalletFromFile').show();

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

    function showLoadingProgress(percent) {
        $('#loadingBox').html("Loading... " + parseInt(percent * 100) + "% complete");
        $('#loadingBox').show();
        $('#loadingBox>header').click(function () {
            $('#errorBox').hide();
        })
    }

    function hideLoadingBar() {
        $('#loadingBox').hide();
    }

    function showLoggedInButtons() {
        $('#linkCreateNewWallet').hide();
        $('#linkImportExistingWalletFromMnemonic').hide();
        $('#linkImportWalletFromFile').hide();

        $('#linkShowMnemonic').show();
        $('#linkViewBalances').show();
        $('#linkSendTransaction').show();
        $('#linkLogout').show();
    }

    function generateNewWallet() {
        let password = $('#createWalletPassword').val();
        // let randomEntropyBytes = utils.randomBytes(16);
        // let mnemonic = HDNode.entropyToMnemonic(randomEntropyBytes);
        let wallet = ethers.Wallet.createRandom();
        encryptAndSaveJSON(wallet, password)
            .then(() => showInfo('PLEASE SAVE YOUR MNEMONIC: ' + wallet.mnemonic));
    }

    function encryptAndSaveJSON(wallet, password) {
        // let entropy = HDNode.mnemonicToEntropy(mnemonic);
        // let privateKey = HDNode.fromMnemonic(mnemonic).derivePath(derivationPath + '0').privateKey;
        // return secretStorage.encrypt(privateKey, password, { entropy }, showLoadingProgress)
        //     .then(json => {
        //         $('#loadingBox').hide();
        //         sessionStorage['HDNode'] = json;
        //         $('#textareaCreateWalletResult').text('JSON: ' + sessionStorage.HDNode);
        //         showLoggedInButtons();
        //     });

        return wallet.encrypt(password, {}, showLoadingProgress)
            .then(json => {
                sessionStorage['HDNode'] = json;
                $('#textareaCreateWalletResult').text('JSON: ' + sessionStorage.HDNode);
                showLoggedInButtons();
            })
            .finally(hideLoadingBar);
    }

    function openWalletFromMnemonic() {
        let mnemonic = $('#textareaOpenWallet').val();
        if (!HDNode.isValidMnemonic(mnemonic))
            return showError('Invalid mnemonic!');

        let password = $('#openWalletPassword').val();
        let wallet = ethers.Wallet.fromMnemonic(mnemonic);

        encryptAndSaveJSON(wallet, password)
            .then(() => showInfo('Wallet successfully loaded!'));
    }

    function decryptWallet(json, password) {
        return ethers.Wallet.fromEncryptedWallet(json, password, showLoadingProgress);
    }

    function openWalletFromFile() {
        if ($('#walletForUpload')[0].files.length === 0) {
            return showError("Please select a file to upload.");
        }
        let password = $('#walletUploadPassword').val();
        let fileReader = new FileReader();
        fileReader.onload = function () {
            let json = fileReader.result;

            decryptWallet(json, password)
                .then(signingKey => {

                    //Check that the JSON is generated from a mnemonic and not from a single private key
                    if(!signingKey.mnemonic)
                        return showError("Invalid JSON file!");

                    sessionStorage['HDNode'] = json;
                    showInfo('Wallet successfully loaded!');
                    showLoggedInButtons();
                })
                .catch(showError)
                .finally(hideLoadingBar);
        };
        fileReader.readAsText($('#walletForUpload')[0].files[0]);
    }

    function showMnemonic() {
        let password = $('#showMnemonicPassword').val();
        let json = sessionStorage.HDNode;

        decryptWallet(json, password)
            .then(signingKey => {
                showInfo("Your mnemonic is: " + signingKey.mnemonic);
            })
            .catch(showError)
            .finally(hideLoadingBar)
    }

    function showAddressesAndBalances() {
        let password = $('#viewBalancesPassword').val();
        let json = sessionStorage.HDNode;
        decryptWallet(json, password)
            .then(renderAddressesAndBalances)
            .catch(showError)
            .finally(hideLoadingBar);

        function renderAddressesAndBalances(signingKey) {
            console.log(signingKey);
            let masterNode = HDNode.fromMnemonic(signingKey.mnemonic);
            for (let i = 0; i < 5; i++) {
                let div = $('<div id="qrcode">');
                let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);

                wallet.getBalance().then((balance) => {
                    div.qrcode(wallet.address);
                    div.append($(`<p>${wallet.address}: ${utils.formatEther(balance)} ETH</p>`));
                    $('#renderWallets').append(div);
                })
                    .catch(showError);
            }
        }
    }

    function unlockWalletAndDeriveAddresses() {
        let password = $('#sendTransactionPassword').val();
        let json = sessionStorage.HDNode;
        ethers.Wallet.fromEncryptedWallet(json, password, showLoadingProgress)
            .then(renderAddresses)
            .catch(showError)
            .finally(hideLoadingBar);

        function renderAddresses(signingKey) {
            let masterNode = HDNode.fromMnemonic(signingKey.mnemonic);
            for (let i = 0; i < 5; i++) {
                let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);
                let address = wallet.address;

                wallets[address] = wallet;
                let option = $(`<option id=${wallet.address}>`).text(address);
                $('#senderAddress').append(option);
            }
        }
    }

    function signTransaction() {
        let address = $('#senderAddress option:selected').attr('id');

        let wallet = wallets[address];
        if (!wallet)
            return showError("Invalid address!");

        let recipient = $('#recipientAddress').val();
        if (!recipient)
            return showError("Invalid recipient");

        let value = $('#transferValue').val();
        if (!value)
            return showError("Invaid transfer value!");

        wallet.getTransactionCount()
            .then(signTransaction)
            .catch(showError);

        function signTransaction(nonce) {
            console.log(nonce);
            let transaction = {
                nonce,
                gasLimit: 21000,
                gasPrice: utils.bigNumberify("20000000000"),
                to: recipient,
                value: utils.parseEther(value.toString()),
                data: "0x",
                chainId: provider.chainId
            };
            console.log(transaction);
            let signedTransaction = wallet.sign(transaction);
            $('#textareaSignedTransaction').val(signedTransaction);
        }
    }

    function sendSignedTransaction() {
        let signedTransaction = $('#textareaSignedTransaction').val();
        provider.sendTransaction(signedTransaction)
            .then(hash => {
                showInfo("Transaction hash: " + hash);
            })
            .catch(showError);
    }

    function logout() {
        sessionStorage.clear();
        showView('viewHome');
    }
});