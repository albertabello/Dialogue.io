import time, datetime
from django.shortcuts import get_object_or_404
from django.utils.html import strip_tags
from django_socketio import events, NoSocket

from space.models import Call
from space.models import Session
from django.contrib.auth.models import User
from social_auth.models import UserSocialAuth
from facebook import GraphAPI

@events.on_finish(channel="^user-")
def profile_handler_disconnect(request, socket, context):
    """
    Event handler for offline status in new users at home.
    """
    usr = User.objects.get(id=request.user.id)
    print str(request.user.first_name)+' '+request.user.last_name+' setting offline'
    #Handles the error of refreshing the page by using a flag selector in the avalialbe socket table
    try:
        session = Session.objects.get(id_websocket = request.user.id)
        if session.time == False:
            print "deleting user..."
            usr.is_active = True;
            usr.save()
            session.delete()
            #Provisional way to alert friends of offline status
            token = UserSocialAuth.objects.get(user__username=request.user.username, provider='facebook').extra_data['access_token']
            uid = UserSocialAuth.objects.get(user__username=request.user.username, provider='facebook').uid
            graph = GraphAPI(token)
            friends = graph.get_connections(uid, "friends", fields="installed,id,name")['data']
            for friend in friends:
                if friend.get("installed"):
                    social_usr = UserSocialAuth.objects.get(uid=friend.get("id"), provider='facebook') #Searching for the user to call in db
                    dbfriend = User.objects.get(id=social_usr.user_id)
                    if dbfriend.is_active == False:
                        offline_message = {"id": str(dbfriend.id), "action": "friend_offline", "message": str(request.user.id)}
                        print offline_message
                        try:
                            socket.broadcast_channel(offline_message, channel='user-'+str(dbfriend.id))
                        except NoSocket, e:
                            print e
        else:
            session.time = False
            session.save()
            #print "user refresh"
    except:
        print "error unsubscribe"
    
@events.on_subscribe(channel="^user-")
def profile_handler(request, socket, context, channel):
    """
    Event handler for online status in new users at home.
    """
    usr = User.objects.get(id=request.user.id)
    usr.is_active = False;
    usr.save()
    print str(request.user.first_name)+' '+request.user.last_name+' setting online'
    try:
        session, created = Session.objects.get_or_create(id_websocket = request.user.id)
        if created == False:
            session.time = True
            session.save()
        else:
            session.time = False
            session.save()
        token = UserSocialAuth.objects.get(user__username=request.user.username, provider='facebook').extra_data['access_token']
        uid = UserSocialAuth.objects.get(user__username=request.user.username, provider='facebook').uid
        graph = GraphAPI(token)
        friends = graph.get_connections(uid, "friends", fields="installed,id,name")['data']
        for friend in friends:
            if friend.get("installed"):
                social_usr = UserSocialAuth.objects.get(uid=friend.get("id"), provider='facebook') #Searching for the user to call in db
                dbfriend = User.objects.get(id=social_usr.user_id)
                if dbfriend.is_active == False:
                    online_message = {"id": str(dbfriend.id), "action": "friend_online", "message": str(request.user.id)}
                    print online_message
                    try:
                        socket.broadcast_channel(online_message, channel='user-'+str(dbfriend.id))
                    except NoSocket, e:
                        print e
    except:
        print "error subscribe"

@events.on_message(channel="^user-")
def message_for_profile(request, socket, context, message):
    #Used to retreive online status of your friendlist
    #if message["action"] == "online":
    #    print message["id"]+' is online now'
    #if message["action"] == "offline":
    #    print message["id"]+' is offline now'
    if message["action"] == "video_sdp":
        json = {"id": message["to_who_id"], "action": "video_sdp", "message":message["message"], "from": message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "candidate":
        json = {"id": message["to_who_id"], "action": "candidate", "message":message["message"], "from": message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "offer":
        json = {"id": message["to_who_id"], "action": "offer", "message":message["message"], "from": message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "answer":
        json = {"id": message["to_who_id"], "action": "answer", "message":message["message"], "from": message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "video_invite":
        json = {"id": message["to_who_id"], "action": "video_invite", "invited_by": message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "effect":
        json = {"id": message["to_who_id"], "action": "effect", "effect": message["effect"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "video_invite_reply":
        json = {"id": message["to_who_id"], "action": "video_invite_accept", "message":message["message"], "from": message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])
    if message["action"] == "chat_message":
        json = {"id": message["to_who_id"], "action": "chat_message", "message": message["message"], "from":message["id"]}
        socket.broadcast_channel(json, channel='user-'+message["to_who_id"])        
