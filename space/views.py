import urllib, socket, urllib2, os, json, datetime, re, smtplib
from email.mime.text import MIMEText
from django.http import HttpResponse, HttpResponseRedirect
from django.template import Context, RequestContext
from django.template.loader import get_template
from django.shortcuts import render_to_response
from django.contrib.auth import *
from django.http import Http404
from django.contrib.auth.models import User
from django.core.context_processors import csrf
from django.utils import simplejson
from django.http import HttpRequest  
from social_auth.models import UserSocialAuth
from django.core.urlresolvers import reverse

from django.shortcuts import get_object_or_404, render, redirect
from django_socketio import broadcast, broadcast_channel, NoSocket

from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from settings import PROFILE_ROOT, MEDIA_URL, STATIC_URL, FACEBOOK_APP_ID, FACEBOOK_API_SECRET
from facebook import GraphAPI
from space.models import Call

@login_required
def home(request, name):
    """
    It shows the profile of the authenticated user.
    Also redirect to another user space through the finder.
    Saves the token into usr.token for accessing FB data
    If the user doesn't exist in the database, It shows the errors and exceptions properly .
    """ 
    c = {}
    c.update(csrf(request))
    try:
        usr = User.objects.get(username=name)
        try:
            usr.token = UserSocialAuth.objects.get(user__username=usr.username, provider='facebook').extra_data['access_token']
            usr.uid = UserSocialAuth.objects.get(user__username=usr.username, provider='facebook').uid
       	    graph = GraphAPI(usr.token)
       	    friends = graph.get_connections(usr.uid, "friends", fields="installed,id,name")['data']
       	    me = graph.get_object("me")
	    friends_local = []
	    for friend in friends:
		if friend.get("installed"):
		    social_usr = UserSocialAuth.objects.get(uid=friend.get("id"), provider='facebook') #Searching for the user to call in db
		    dbfriend = User.objects.get(id=social_usr.user_id)
		    sample = {"id": str(dbfriend.id), "name": dbfriend.first_name+' '+dbfriend.last_name, "online": dbfriend.is_active, "username": dbfriend.username}
		    friends_local.append(sample)
       	except:
       	    uid = ''
       	    token = ''
       	    friends = ''
       	    me = ''
	    friends_local = []  
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    	if x_forwarded_for:
        	usr.ip = x_forwarded_for.split(',')[-1].strip()
    	else:
        	usr.ip = request.META.get('REMOTE_ADDR')
    except User.DoesNotExist:
        raise Http404
    
    if request.method == 'POST':
        another_user = request.POST.get('another_user')
        try:
             exist = User.objects.get(username=another_user)
        except User.DoesNotExist:
            return render_to_response("space/user_not_exist.html", RequestContext(request,{}))
        return HttpResponseRedirect("/" + another_user + "/")
    
    return render_to_response("space/profile.html", c, RequestContext(request,{
        'user':request.user, 'owner':usr, 'friends':friends, 'me':me, 'friends_local':friends_local
    }))
             
@login_required
def change_pass(request, name):
    """
    This view permits the user to change its password.
    """
    if request.user.username == name:
        form = PasswordChangeForm(request.user)
        if request.POST:
                form = PasswordChangeForm(request.user,request.POST)
                if form.is_valid():
                    form.save()
                    return HttpResponseRedirect('done/')
        return render_to_response('space/change_pass_form.html', {
                'form': form } , context_instance=RequestContext(request)
            )
    else:
        raise Http404

@login_required
def room(request, name, slug):
    """
    Show a room.
    """
    if request.user.username == name:
        c = {}
        c.update(csrf(request))
        context = {"room": get_object_or_404(Call, slug=slug)}
        #print request.user
        #template="space/room.html"
        owner=request.user
        try:
            owner.token = UserSocialAuth.objects.get(user__username=owner.username, provider='facebook').extra_data['access_token']
            owner.uid = UserSocialAuth.objects.get(user__username=owner.username, provider='facebook').uid
       	    graph = GraphAPI(owner.token)
       	    friends = graph.get_connections(owner.uid, "friends", fields="installed,id,name")['data']
       	    me = graph.get_object("me")
       	except:
       	    uid = ''
       	    token = ''
       	    friends = ''
       	    me = ''
        return render_to_response('space/room.html',context, RequestContext(request,{'owner': owner, 'me': me}))
        #return render(request, template, context)
    else:
        raise Http404
    
@login_required
def create(request, name):
    """
    Handles post from the "Add room" form, and
    redirects to the new room.
    """
    if request.user.username == name:
        c = {}
        c.update(csrf(request))
        if request.method == 'POST': # If the form has been submitted...
            id = request.POST.get("name")
	    usertocall = UserSocialAuth.objects.get(uid=id, provider='facebook') #Searching for the user to chat in db
	    if usertocall.user_id < request.user.id:
		x = usertocall.user_id
		y = request.user.id
	    else:
		x = request.user.id
		y = usertocall.user_id
	    date = re.sub("\D","",str(datetime.date.today()))
	    chatroomname = str(x)+"_"+str(y)+"_"+str(date)
            room, created = Call.objects.get_or_create(name=chatroomname)
            if created:
                print 'Room created :' 
                print room
            try:
            	if UserSocialAuth.objects.get(user__username=request.user.username, provider='facebook').uid == id:
            		print 'User joining'
            	else:
		    message = {"action": "gotoroom", "name": request.user.first_name+" "+request.user.last_name, "message": chatroomname}
                    broadcast_channel(message, channel='user-'+str(usertocall.user_id))
                    print message
            except NoSocket, e:
                print e
            return HttpResponseRedirect('/'+request.user.username+'/'+room.slug+'/')
        else:
            return HttpResponseRedirect('/')
    else:
        raise Http404

@login_required
def email(request, name):
    """
    If any user is called and not online system sends him a email
    to inform that someone is willing to talk to him
    """
    if request.user.username == name:
        c = {}
        c.update(csrf(request))
        if request.method == 'POST': # If the form has been submitted...
            id = request.POST.get("name")
	    usertocall = UserSocialAuth.objects.get(uid=id, provider='facebook') #Searching for the user to chat in db
	    user= User.objects.get(id=usertocall.user_id)
	    msg = MIMEText('Hey! I would like to have a chat with you as soon as possible :) \n' +
			   'So if you would like to talk login to vr000m. \n'+str(request.user.first_name)+' '+ str(request.user.last_name))
	    msg['Subject'] = str(request.user.first_name)+' '+str(request.user.last_name)+' has called you'
	    msg['From'] = str(request.user.email).lower()
	    msg['To'] = str(user.email).lower()
	    s = smtplib.SMTP('localhost')
	    s.sendmail(request.user.email, user.email, msg.as_string())
            return HttpResponseRedirect('/')
        else:
            return HttpResponseRedirect('/')
    else:
        raise Http404
    

@login_required
def system_message(request, name, template="space/system_message.html"):
    context = {"rooms": Call.objects.all()}
    if request.method == "POST":
        room = request.POST["room"]
        data = {"action": "system", "message": request.POST["message"]}
        try:
            if room:
                broadcast_channel(data, channel="room-" + room)
            else:
                broadcast(data)
        except NoSocket, e:
            context["message"] = e
        else:
            context["message"] = "Message sent"
    return render(request, template, context)     
        
def change_pass_done(request, name):
    """
    Display if the password has changed successfully.
    """
    return render_to_response('space/change_pass_done.html',
             context_instance=RequestContext(request))
    
def render_javascript(request, name):
    return render_to_response("js/js_page.js", mimetype="text/javascript")

def lookup_users(request, name):
    """
    This view is used to auto-complete the most relevant results in the finder.
    Look for the names in the database and display them in the page below the finder.
    It's performed by using a javascript function and jquery library.
    """
    # Default return list
    results = []
    if request.method == "GET":
        if request.GET.has_key(u'query'):
            value = request.GET[u'query']
            # Ignore queries shorter than length 3
            if len(value) > 0:
                model_results = User.objects.filter(username__icontains=value)
                results = [ x.username for x in model_results ]
                print results
    json = simplejson.dumps(results)
    return HttpResponse(json, mimetype='application/json')
    
def widgetCall(request):
    print "incomming widgetCall"
    print request.META.get(u'QUERY_STRING')
    XS_SHARING_ALLOWED_ORIGINS = '*'
    XS_SHARING_ALLOWED_METHODS = ['POST','GET','OPTIONS', 'PUT', 'DELETE']
    #Should compute firs the answer to the offer
    #Response to send by using the response header of the httprequest made by the client
    json = simplejson.dumps("WAZZZUPSSSDFSDF!")
    response = HttpResponse()
    response['Access-Control-Allow-Origin']  = XS_SHARING_ALLOWED_ORIGINS 
    response['Access-Control-Allow-Methods'] = ",".join( XS_SHARING_ALLOWED_METHODS )
    #response['mimetype'] = 'application/json'
    #response['data'] = json
    response.write(str(json))
    print response
    return response
    return None
