$(document).ready(function () {
    const derivationPath = "m/44'/60'/0'/0/";
    const provider = ethers.providers.getDefaultProvider('ropsten');

    let wallets = {};

    showView("viewHome");

    $('#linkHome').click(function () {
        showView("viewHome");
    });

    $('#linkCreateNewWallet').click(function () {
        $('#textareaCreateWalletResult').val('');
        showView("viewCreateNewWallet");
    });

    $('#linkImportWalletFromMnemonic').click(function () {
        $('#textareaOpenWallet').val('');
        $('#textareaOpenWalletResult').val('');
        $('#textareaOpenWallet').val('toddler online monitor oblige solid enrich cycle animal mad prevent hockey motor');
        showView("viewOpenWalletFromMnemonic");
    });
    $('#linkImportWalletFromFile').click(function () {
        $('#passwordWalletUpload').val('');
        showView("viewOpenWalletFromFile");
    });

    $('#linkShowMnemonic').click(function () {
        $('#passwordShowMnemonic').val('');
        showView("viewShowMnemonic");
    });

    $('#linkShowAddressesAndBalances').click(function () {
        $('#passwordShowAddresses').val('');
        $('#divAddressesAndBalances').empty();
        showView("viewShowAddressesAndBalances");
    });
    $('#linkSendTransaction').click(function () {
        $('#divSignAndSendTransaction').hide();

        $('#passwordSendTransaction').val();
        $('#transferValue').val('');
        $('#senderAddress').empty();

        $('#textareaSignedTransaction').val('');
        $('#textareaSendTransactionResult').val('');

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

    $('#linkDelete').click(deleteWallet);

    function showView(viewName) {
        // Hide all views and show the selected view only
        $('main > section').hide();
        $('#' + viewName).show();

        if (sessionStorage.HDNode) {
            $('#linkCreateNewWallet').hide();
            $('#linkImportWalletFromMnemonic').hide();
            $('#linkImportWalletFromFile').hide();

            $('#linkShowMnemonic').show();
            $('#linkShowAddressesAndBalances').show();
            $('#linkSendTransaction').show();
            $('#linkDelete').show();
        }
        else {
            $('#linkShowMnemonic').hide();
            $('#linkShowAddressesAndBalances').hide();
            $('#linkSendTransaction').hide();
            $('#linkDelete').hide();

            $('#linkCreateNewWallet').show();
            $('#linkImportWalletFromMnemonic').show();
            $('#linkImportWalletFromFile').show();
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
        $('#linkImportWalletFromMnemonic').hide();
        $('#linkImportWalletFromFile').hide();

        $('#linkShowMnemonic').show();
        $('#linkShowAddressesAndBalances').show();
        $('#linkSendTransaction').show();
        $('#linkDelete').show();
    }

    function encryptAndSaveJSON(wallet, password) {
        return wallet.encrypt(password, {}, showLoadingProgress)
            .then(json => {
                sessionStorage['HDNode'] = json;
                showLoggedInButtons();
            })
            .finally(hideLoadingBar);
    }

    function decryptWallet(json, password) {
        return ethers.Wallet.fromEncryptedWallet(json, password, showLoadingProgress);
    }

    function generateNewWallet() {
        let password = $('#passwordCreateWallet').val();
        let wallet = ethers.Wallet.createRandom();

        encryptAndSaveJSON(wallet, password)
            .then(() => {
                showInfo("PLEASE SAVE YOUR MNEMONIC: " + wallet.mnemonic);
                $('#textareaCreateWalletResult').val(sessionStorage.HDNode);
            });
    }

    function openWalletFromMnemonic() {
        let mnemonic = $('#textareaOpenWallet').val();
        if (!ethers.HDNode.isValidMnemonic(mnemonic))
            return showError('Invalid mnemonic!');

        let password = $('#passwordOpenWallet').val();
        let wallet = ethers.Wallet.fromMnemonic(mnemonic);

        encryptAndSaveJSON(wallet, password)
            .then(() => {
                showInfo("Wallet successfully loaded!");
                $('#textareaOpenWalletResult').val(sessionStorage.HDNode);
            });
    }

    function openWalletFromFile() {
        if ($('#walletForUpload')[0].files.length === 0) {
            return showError("Please select a file to upload.");
        }
        let password = $('#passwordUploadWallet').val();

        let fileReader = new FileReader();
        fileReader.onload = function () {
            let json = fileReader.result;

            decryptWallet(json, password)
                .then(signingKey => {

                    //Check that the JSON is generated from a mnemonic and not from a single private key
                    if (!signingKey.mnemonic)
                        return showError("Invalid JSON file!");

                    sessionStorage['HDNode'] = json;
                    showInfo("Wallet successfully loaded!");
                    showLoggedInButtons();
                })
                .catch(showError)
                .finally(hideLoadingBar);
        };

        fileReader.readAsText($('#walletForUpload')[0].files[0]);
    }

    function showMnemonic() {
        let password = $('#passwordShowMnemonic').val();
        let json = sessionStorage.HDNode;

        decryptWallet(json, password)
            .then(signingKey => {
                showInfo("Your mnemonic is: " + signingKey.mnemonic);
            })
            .catch(showError)
            .finally(hideLoadingBar)
    }

    function showAddressesAndBalances() {
        let password = $('#passwordShowAddresses').val();
        let json = sessionStorage.HDNode;
        decryptWallet(json, password)
            .then(renderAddressesAndBalances)
            .catch(showError)
            .finally(hideLoadingBar);

        function renderAddressesAndBalances(signingKey) {
            $('#divAddressesAndBalances').empty();

            let masterNode = ethers.HDNode.fromMnemonic(signingKey.mnemonic);

            for (let i = 0; i < 5; i++) {
                let div = $('<div id="qrcode">');
                let wallet = new ethers.Wallet(masterNode.derivePath(derivationPath + i).privateKey, provider);

                wallet.getBalance()
                    .then((balance) => {
                        div.qrcode(wallet.address);
                        div.append($(`<p>${wallet.address}: ${ethers.utils.formatEther(balance)} ETH</p>`));
                        $('#divAddressesAndBalances').append(div);
                    })
                    .catch(showError)
            }
            showInfo("Wallets Successfully Loaded!");
        }
    }

    function unlockWalletAndDeriveAddresses() {
        let password = $('#passwordSendTransaction').val();
        let json = sessionStorage.HDNode;

        ethers.Wallet.fromEncryptedWallet(json, password, showLoadingProgress)
            .then(signingKey => {
                showInfo("Wallet successfully unlocked!");
                renderAddresses(signingKey);
                $('#divSignAndSendTransaction').show();
            })
            .catch(showError)
            .finally(hideLoadingBar);

        function renderAddresses(signingKey) {
            $('#senderAddress').empty();

            let masterNode = ethers.HDNode.fromMnemonic(signingKey.mnemonic);
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
                gasPrice: ethers.utils.bigNumberify("20000000000"),
                to: recipient,
                value: ethers.utils.parseEther(value.toString()),
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

                let etherscanUrl = 'https://ropsten.etherscan.io/tx/' + hash;
                $('#textareaSendTransactionResult').val(etherscanUrl);
            })
            .catch(showError);
    }

    function deleteWallet() {
        sessionStorage.clear();
        showView('viewHome');
    }
});