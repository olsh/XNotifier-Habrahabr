/**********************************************************
 Habrahabr
 Author: BloodUnit http://habrahabr.ru/users/bloodunit/
 **********************************************************/

var name = "Habrahabr";
var ver = "2014-05-06";
var hostString = "habrahabr.ru";

function init() {
    this.initStage = ST_PRE;
    this.loginData = ["https://id.tmtm.ru/ajax/login/", "email", "password", "consumer=habrahabr&captcha_type=recaptcha&captcha="];
    this.dataURL = "http://habrahabr.ru/";
    this.viewURL = "http://habrahabr.ru/tracker/";
    this.cookieDomain = "habrahabr.ru";
}

function getCount(aData) {
    var trackerNode = aData.match(/<a.+?data-tab="tracker_tab"[\s\S]*?\/a>/);
    if (!trackerNode) {
        return -1;
    } else {
        var counter = 0;
        var counterRegex = /class="count"[^>]*>\+?(\d*)/g;
        var counterResult;
        while ((counterResult = counterRegex.exec(trackerNode[0])) !== null) {
            counter += +counterResult[1] || 0;
        }
        return counter;
    }
}

function checkLogin(aData, aHttp) {
    switch (this.stage) {
        case ST_CHECK:
            this.getHtml(this.dataURL);
            return false;
        case ST_CHECK + 1:
            var trackerLink = aData.match(/<a.+?data-tab="tracker_tab"/);
            if (trackerLink) {//logged in already
                this.stage = ST_DATA;
                this.getHtml(this.dataURL);
                return true;
            } else {
                this.stage = this.initStage;
                return this.process("");
            }
    }
    this.onError();
    return true;
}

function process(aData, aHttp) {
    if (this.debug)dlog(this.id + "\t" + this.user + "\t" + this.stage, aData);
    switch (this.stage) {
        case ST_PRE:
            this.getHtml("https://auth.habrahabr.ru/login/");
            return false;
        case ST_PRE_RES:
            // TODO: Figure out how to get the recaptcha link (habr uses ajax calls to get captcha)
            var recaptchaScriptLink = aData.match(/(\/\/www.google.com\/recaptcha\/api\/challenge\S+?)"/);
            var state = aData.match(/state=([\w\n]+)/);
            if (state) {
                this.originPostData = this.loginData[LOGIN_POST];
                this.loginData[LOGIN_POST] += "&state=" + encodeURIComponent(state[1]);
                this.referer = this.loginData[LOGIN_URL] + "?" + "&state=" + encodeURIComponent(state[1]) + "&consumer=habrahabr";
                if (recaptchaScriptLink) {
                    this.getHtml("https:" + recaptchaScriptLink[1]);
                    return false;
                } else { // If we can't find the captcha, then just login
                    this.stage = ST_LOGIN;
                    return this.process(aData, aHttp);
                }
            }
            this.onError();
            break;
        case ST_PRE_RES + 1:
            var recaptchaUid = aData.match(/challenge\s*:\s*'(\S+?)'/);
            if (recaptchaUid) {
                this.loginData[LOGIN_POST] += "&recaptcha_challenge_field=" + encodeURIComponent(recaptchaUid[1]);
                this.openCaptchaDialog(this.id, this.user, "https://www.google.com/recaptcha/api/image?c=" + recaptchaUid[1]);
                return false;
            }
            this.onError();
            break;
        case ST_PRE_RES + 2:
            this.loginData[LOGIN_POST] += "&recaptcha_response_field=" + encodeURIComponent(aData);
            this.stage = ST_LOGIN;
            return this.process(aData, aHttp);
            break;
        case ST_LOGIN:
            this.getHtml(this.loginData[LOGIN_URL], this.loginData[LOGIN_POST], {
                Referer: this.referer
            });
            return false;
        case ST_LOGIN_RES:
            this.loginData[LOGIN_POST] = this.originPostData;
            var habrRedirectLink = aData.match(/'(.*?)'/);
            if (habrRedirectLink) {
                this.getHtml(habrRedirectLink[1]);
            }
            this.stage = ST_DATA;
            return true;
    }
    return this.baseProcess(aData, aHttp);
}