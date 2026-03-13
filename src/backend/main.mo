import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Outcall "./http-outcalls/outcall";

actor {

  // Keep old stable vars for upgrade compatibility
  stable var merchantId : Text = "";
  stable var merchantPassword : Text = "";
  stable var integritySalt : Text = "";
  stable var isSandbox : Bool = true;

  stable var transactions : [TransactionRecord] = [];

  public type TransactionRecord = {
    txnRef : Text;
    mobileNumber : Text;
    amount : Nat;
    description : Text;
    status : Text;
    responseCode : Text;
    responseMessage : Text;
    timestamp : Int;
  };

  public type PaymentRequest = {
    mobileNumber : Text;
    cnic : Text;
    amount : Nat;
    description : Text;
    txnRef : Text;
    txnDateTime : Text;
    txnExpiryDateTime : Text;
    secureHash : Text;
    merchantId : Text;
    merchantPassword : Text;
    isSandbox : Bool;
  };

  public type PaymentResult = {
    txnRef : Text;
    responseCode : Text;
    responseMessage : Text;
    status : Text;
  };

  public func initiatePayment(req : PaymentRequest) : async PaymentResult {
    let apiUrl = if (req.isSandbox) {
      "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction"
    } else {
      "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction"
    };

    let amountStr = req.amount.toText();
    let billRef = "BILL" # req.txnRef;

    let q = "\"";
    let body = "{" #
      q # "pp_Version" # q # ":" # q # "1.1" # q # "," #
      q # "pp_TxnType" # q # ":" # q # "MWALLET" # q # "," #
      q # "pp_Language" # q # ":" # q # "EN" # q # "," #
      q # "pp_MerchantID" # q # ":" # q # req.merchantId # q # "," #
      q # "pp_SubMerchantID" # q # ":" # q # q # "," #
      q # "pp_Password" # q # ":" # q # req.merchantPassword # q # "," #
      q # "pp_BankID" # q # ":" # q # "TBANK" # q # "," #
      q # "pp_ProductID" # q # ":" # q # "RETL" # q # "," #
      q # "pp_TxnRefNo" # q # ":" # q # req.txnRef # q # "," #
      q # "pp_Amount" # q # ":" # q # amountStr # q # "," #
      q # "pp_TxnCurrency" # q # ":" # q # "PKR" # q # "," #
      q # "pp_TxnDateTime" # q # ":" # q # req.txnDateTime # q # "," #
      q # "pp_BillReference" # q # ":" # q # billRef # q # "," #
      q # "pp_Description" # q # ":" # q # req.description # q # "," #
      q # "pp_TxnExpiryDateTime" # q # ":" # q # req.txnExpiryDateTime # q # "," #
      q # "pp_MobileNumber" # q # ":" # q # req.mobileNumber # q # "," #
      q # "pp_CNIC" # q # ":" # q # req.cnic # q # "," #
      q # "pp_SecureHash" # q # ":" # q # req.secureHash # q #
      "}";

    let headers : [Outcall.Header] = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Accept"; value = "application/json" },
    ];

    var responseCode = "999";
    var responseMessage = "Unknown error";
    var status = "FAILED";

    try {
      let response = await Outcall.httpPostRequest(apiUrl, headers, body, transform);
      responseCode := extractJsonValue(response, "pp_ResponseCode");
      responseMessage := extractJsonValue(response, "pp_ResponseMessage");
      status := if (responseCode == "000") "SUCCESS" else if (responseCode == "157") "PENDING" else "FAILED";
    } catch (_) {
      responseCode := "ERR";
      responseMessage := "Network error: could not reach JazzCash API";
      status := "FAILED";
    };

    let newRecord : TransactionRecord = {
      txnRef = req.txnRef;
      mobileNumber = req.mobileNumber;
      amount = req.amount;
      description = req.description;
      status = status;
      responseCode = responseCode;
      responseMessage = responseMessage;
      timestamp = Time.now();
    };

    let len = transactions.size();
    transactions := Array.tabulate(
      len + 1,
      func(i : Nat) : TransactionRecord {
        if (i < len) { transactions[i] } else { newRecord }
      }
    );

    { txnRef = req.txnRef; responseCode = responseCode; responseMessage = responseMessage; status = status };
  };

  public query func getTransactions() : async [TransactionRecord] {
    transactions;
  };

  func extractJsonValue(json : Text, key : Text) : Text {
    let needle = key # "\":\"";
    let parts = json.split(#text needle);
    ignore parts.next();
    switch (parts.next()) {
      case null { "" };
      case (?after) {
        let valueParts = after.split(#text "\"");
        switch (valueParts.next()) {
          case null { "" };
          case (?val) { val };
        };
      };
    };
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    { input.response with headers = [] };
  };
};
