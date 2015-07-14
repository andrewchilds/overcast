var _ = require('lodash');
var utils = require('./utils');
var phantom = require('phantom');

exports.options = null;

exports.setConfig = function (args) {
  exports.options = args;
  exports.GODADDY_URL = "https://dns.godaddy.com/ZoneFile.aspx?zone=" + args.domain + "&zoneType=0&refer=dcc&prog_id=GoDaddy";
  exports.ACTIONS = ["addRecord", "selectTypeRecord", "clickOK"];
};

exports.addRecord = function (ph, page) {
  page.evaluate(function(){
    $('#divAddRecord').click();
  }, function(err, result){
    exports.changeAction(ph, page, 1000);
  });
};

exports.selectTypeRecord = function (ph, page) {
  page.evaluate(function(options){
    $("#ctl00_cphMain_ctl00_ddlRecordType", $("#ifrm").contents()).val("A");
    setTimeout($("#ctl00_cphMain_ctl00_ddlRecordType", $("#ifrm").contents()).trigger("change"), 100);
    $("#ctl00_cphMain_ctl00_txtARecordHost", $("#ifrm").contents()).val(options.domain_name);
    $("#ctl00_cphMain_ctl00_txtARecordPointsto", $("#ifrm").contents()).val(options.ip_address);
    setTimeout($("#ctl00_cphMain_ctl00_btnOK", $("#ifrm").contents()).click(), 100);
    setTimeout($("#ctl00_cphMain_divSaveOne .cssblack-button").click(), 100);
  }, function(err, result){
    exports.changeAction(ph, page, 1000);
  }, exports.options);
};

exports.clickOK = function (ph, page) {
  page.evaluate(function(){
    $("#modalOkTwo").click();
  }, function(err, result){
    exports.changeAction(ph, page, 1000);
  });
};

exports.changeAction = function (ph, page, time) {
  setTimeout(function () {
    var action = exports.ACTIONS.shift();

    if(action === undefined){
      page.close();
      ph.exit(0);
    } else {
      exports[action](ph, page);
    }
  }, time);
};

exports.handlePage = function (ph, page) {
  var variables = utils.getVariables();

  page.open(exports.GODADDY_URL, function() {
    page.includeJs("https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js", function() {
     page.evaluate(function(credentials){
        $('#Login_userEntryPanel2_UsernameTextBox').val(credentials.GODADDY_USERNAME);
        $('#Login_userEntryPanel2_PasswordTextBox').val(credentials.GODADDY_PASSWORD);
        $('#LoginImageButton_div').click();
      }, function(err, result){
        exports.changeAction(ph, page, 4000);
      }, variables);
    });
  });
}

exports.initialize = function (args) {
  exports.setConfig(args);

  phantom.create('--load-images=no', '--ignore-ssl-errors=true', function (ph) {
    ph.createPage(function (page) {
      exports.handlePage(ph, page);
    });
  });
};



