var postUrl = PropertiesService.getScriptProperties().getProperty('maimai'); //GASのプロパティに登録してるslackのwebhook URL。直で文字列として書いても良いです！
var BASEURL = "https://{teamName}.backlog.com/";　//backlog開いたときのurlのbase部分。{teamName}に値入れてください
var slackMemberSheetId = ""; //slackのidとbacklogのidを変換するのに使ってるスプレッドシートのid
// 上のシートでの列番号。Aが0で、Gが6
var colSlackMemberId = 0;
var colBacklogMemberId = 6;
var alertMessage = ":maimai_3:「Backlogからのお知らせだよ〜！」";　//botからのメッセージ。癒されるやつを入れてください。

var backlog_changes_status = {
  "1":"未対応",
  "2":"処理中",
  "3":"処理済み",
  "4":"完了"
};

var backlog_changes_priority = {
  "2":"高",
  "3":"中",
  "4":"低"
};

var backlog_changes_resolution = {
  "":"",
  "0":"対応済み",
  "1":"対応しない",
  "2":"無効",
  "3":"重複",
  "4":"再現しない"
};

// backlogからのjsonを整形
function makeChatMessage(body) {
  var msgObj = new Object();
  var label = "";
  var bl_key = "";
  var bl_summary = "";
  var bl_comment = "";
  var bl_url = "";
  var bl_to ="";
  var bl_changes = "";
  var bl_description = "";

  switch (body.type) {
    case 1:
      label = "追加";
      bl_key = "["+body.project.projectKey+"-"+body.content.key_id+"]";
      bl_summary = "「" + body.content.summary + "」";
      bl_url = BASEURL+"view/"+body.project.projectKey+"-"+body.content.key_id;
      bl_description = body.content.description;
      break;
    case 2:
      label = "更新";
      bl_key = "["+body.project.projectKey+"-"+body.content.key_id+"]";
      bl_summary = "「" + body.content.summary + "」";
      bl_url = BASEURL+"view/"+body.project.projectKey+"-"+body.content.key_id;
      if(body.content.changes.length > 0){
        for(var c = 0; c < body.content.changes.length; c++){
          switch (body.content.changes[c].field){
            case 'status':
              bl_changes += "・状態を「"+backlog_changes_status[body.content.changes[c].old_value]+"」から「"+backlog_changes_status[body.content.changes[c].new_value]+"」に変更しました。\n";
              break;
            case 'priority':
              bl_changes += "・優先度を「"+backlog_changes_priority[body.content.changes[c].old_value]+"」から「"+backlog_changes_priority[body.content.changes[c].new_value]+"」に変更しました。\n";
              break;
            case 'assigner':
              bl_changes += "・担当者を"+body.content.changes[c].old_value+"から"+body.content.changes[c].new_value+"に変更しました。\n";
              break;
            case 'component':
              bl_changes += "・カテゴリを「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'description':
              bl_changes += "・説明文を変更しました。\n";
              bl_description += body.content.changes[c].new_value;
              var stringChangeLength = body.content.changes[c].new_value.length-body.content.changes[c].old_value.length;
              var oldarr = body.content.changes[c].old_value.split("");
              var newarr = body.content.changes[c].new_value.split("");
              if(stringChangeLength==0){
                for(var i in oldarr){
                  if(oldarr[i]!=newarr[i]){
                    if(newarr[i-1]=="["&&newarr[i]=="x"){
                      msgObj = false;
                      return msgObj;
                    }
                  }
                }
              }
              break;
            case 'issueType':
              bl_changes += "・issueTypeを「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'summary':
              bl_changes += "・課題名を「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'limitDate':
              bl_changes += "・期限日を「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'startDate':
              bl_changes += "・開始日を「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'resolution':
              bl_changes += "・完了理由を「"+backlog_changes_resolution[body.content.changes[c].old_value]+"」から「"+backlog_changes_resolution[body.content.changes[c].new_value]+"」に変更しました。\n";
              break;
            case 'version':
              bl_changes += "・発生バージョンを「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'milestone':
              bl_changes += "・マイルストーンを「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'attachment':
              bl_changes += body.content.changes[c].new_value+"を添付しました。\n";
              break;
            case 'estimatedHours':
              bl_changes += "・予定時間を「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            case 'actualHours':
              bl_changes += "・実績時間を「"+body.content.changes[c].old_value+"」から「"+body.content.changes[c].new_value+"」に変更しました。\n";
              break;
            default:
              return;
          }
        }
        if(body.content.comment.content){
          bl_comment += body.content.comment.content;
        }
      }
      break;
    case 3:
      label = "コメント";
      bl_key = "["+body.project.projectKey+"-"+body.content.key_id+"]";
      bl_summary = "「" + body.content.summary + "」";
      bl_url = BASEURL+"view/"+body.project.projectKey+"-"+body.content.key_id+"#comment-"+body.content.comment.id;
      bl_comment = body.content.comment.content;
      break;
    case 14:
      label = "課題まとめて更新";
      bl_key = "";
      bl_summary = "";
      bl_url = BASEURL+"projects/"+body.project.projectKey;
      bl_comment = body.createdUser.name+"さんが課題をまとめて操作しました。";
      break;
    case 5:
      label = "Wiki追加";
      bl_key = "";
      bl_summary = "「"+body.content.name+"」";
      bl_url = BASEURL+"alias/wiki/"+body.content.id;
      bl_comment = body.createdUser.name+"さんがWikiページを追加しました。";
      break;
    case 6:
      label = "Wiki更新";
      bl_key = "";
      bl_summary = "「"+body.content.name+"」";
      bl_url = BASEURL+"alias/wiki/"+body.content.id;
      bl_comment = body.createdUser.name+"さんがWikiページを更新しました。";
      break;
    case 11:
      label = "SVNコミット";
      bl_key = "[r"+body.content.rev+"]";
      bl_summary = "";
      bl_url = BASEURL+"rev/"+body.project.projectKey+"/"+body.content.rev;
      bl_comment = body.content.comment;
      break;
    case 12:
      label = "Gitプッシュ";
      var git_rev = body.content.revisions[0].rev;
      git_rev = git_rev.substr(0,10);
      bl_key = "["+git_rev+"]";
      bl_summary = "";
      bl_url = BASEURL+"git/"+body.project.projectKey+"/"+body.content.repository.name+"/"+body.content.revision_type+"/"+body.content.revisions[0].rev;
      bl_comment = body.content.revisions[0].comment;
      break;
    case 18:
      label = "プルリクエスト追加";
      bl_key = "( 担当:"+body.content.assignee.name+" )";
      bl_summary = "「"+body.content.summary+"」";
      bl_url = BASEURL+"git/"+body.project.projectKey+"/"+body.content.repository.name+"/pullRequests/"+body.content.number;
      bl_comment = body.content.description;
      break;
    case 19:
      label = "プルリクエスト更新";
      bl_key = "( 担当:"+body.content.assignee.name+" )";
      bl_summary = "「"+body.content.summary+"」";
      bl_url = BASEURL+"git/"+body.project.projectKey+"/"+body.content.repository.name+"/pullRequests/"+body.content.number;
      bl_comment = body.content.description;
      break;
    case 20:
      label = "プルリクエストコメント";
      bl_key = "( 担当:"+body.content.assignee.name+" )";
      bl_summary = "";
      bl_url = BASEURL+"git/"+body.project.projectKey+"/"+body.content.repository.name+"/pullRequests/"+body.content.number+"#comment-"+body.content.comment.id;
      bl_comment = body.content.comment.content;
      break;

    default:
      return;
  }

  if(bl_comment=="//"){
    msgObj = false;
    return msgObj;
  }

  if(body.notifications.length > 0){
    bl_to += "_to ";
    for(var i = 0; i < body.notifications.length; i++){
      bl_to += "@"+body.notifications[i].user.nulabAccount.uniqueId+" ";
    }
  }


  if(label){
    msgObj['message'] = alertMessage+"\n";

    if(bl_to != ""){
      msgObj['message'] += bl_to+"\n";
    }

    msgObj['message'] += bl_key+" "
    + label
    + bl_summary
    + " by "
    + body.createdUser.name
    + "\n "+bl_url;

    msgObj['comment'] = bl_comment;
    msgObj['description'] = bl_description;
    msgObj['changes'] = bl_changes;
  }
  return msgObj;
}


// slackに投げる
function postSlack(e,message,changes,description,comment){
  // 引用コメント部分整形
  var attachments_comment_opts = "";
  if(comment){
    attachments_comment_opts = {
      "color": "#42ce9f",
      "text" : comment
    };
  }

  var attachments_description_opts = "";
  if(description){
    attachments_description_opts = {
      "color": "#00FFFF",
      "text" : description
    };
  }

  var attachments_changes_opts = "";
  if(changes){
    attachments_changes_opts = {
      "color": "#FFA500",
      "text" : changes
    };
  }

  var channelId = e.paramter.channelId;

  var jsonData =
      {
        "text" : message,
        "attachments" : [ attachments_changes_opts, attachments_description_opts , attachments_comment_opts ],
        "channel" : channelId
      };
        var payload = JSON.stringify(jsonData);

        var options =
        {
        "method" : "post",
        "contentType" : "application/json",
        "payload" : payload
      };

  UrlFetchApp.fetch(postUrl, options);
}

// シートを配列で取得
function getSlackMemberArray() {
  var Sheet = SpreadsheetApp.openById(slackMemberSheetId);
  var arr = Sheet.getSheetValues(1, 1, Sheet.getLastRow(), Sheet.getLastColumn());
  return arr;
}

// Slackのメンション化
function get_mention(text){
  var slackMemberArray = getSlackMemberArray();
  for(var i in slackMemberArray){
    if(slackMemberArray[i][colBacklogMemberId]==""){

    }else{
      var backlogId = new RegExp('@'+slackMemberArray[i][colBacklogMemberId], 'g');
      text = text.replace(backlogId, '<@'+slackMemberArray[i][colSlackMemberId]+'> ');
    }
  }
  return text;
}

// Main Handler
function doPost(e) {
  var body;
  var slackObj = new Object();
  if(e.postData.contents){
    // json整形・メッセージ作成
    body = JSON.parse(e.postData.contents);

    slackObj = makeChatMessage(body);

    // Slack投稿
    if(slackObj){
      postSlack(e,get_mention(slackObj['message']), get_mention(slackObj['changes']), get_mention(slackObj['description']), get_mention(slackObj['comment']));
    }
  }else{
    Logger.log('対象チャンネルが指定されていないか、データが取得できません。');
  }
}
