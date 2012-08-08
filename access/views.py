from django.http import HttpResponse, HttpResponseRedirect
from django.template import Context, RequestContext
from django.core.context_processors import csrf
from django.template.loader import get_template
from django.shortcuts import render_to_response
from django.contrib.auth import *
from django.http import Http404
from django.conf import settings

from django.contrib.auth.forms import UserCreationForm
from django import forms
from django.contrib.auth.models import User

from django.core.context_processors import csrf
import os
from settings import PROFILE_ROOT

class UserCreateForm(UserCreationForm):
    email = forms.EmailField(label = "Email address", required=True)
    first_name = forms.CharField(label = "First name", required=True)
    last_name = forms.CharField(label = "Last name", required=True)
 
    class Meta:
        model = User
        fields = ("username","password1", "password2","first_name", "last_name", "email")
 
    def save(self, commit=True):
        new_user = super(UserCreateForm, self).save(commit=False)
        new_user.first_name = self.cleaned_data["first_name"]
        new_user.last_name = self.cleaned_data["last_name"]
        new_user.email = self.cleaned_data["email"]
        if commit:
            new_user.save()
        return user
        
FACEBOOK_APP_ID = getattr(settings, 'FACEBOOK_APP_ID', '')
FACEBOOK_API_KEY = getattr(settings, 'FACEBOOK_API_KEY', '')
FACEBOOK_SECRET_KEY = getattr(settings, 'FACEBOOK_SECRET_KEY', '')


def login_view(request):
    """
    After receive the login and password, It is checked the existence of the user and the correct pass
    """ 
    username = password = ''
    if request.POST:
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            #Does not check is active flag as it is used for online features
            #if user.is_active:
            login(request, user)
            return HttpResponseRedirect("/" + username + "/")
            #else:
            #    return HttpResponse("not active")
        else:
            return HttpResponseRedirect("/login_error/")
    else:
        return HttpResponse("no post")

def logout_view(request):
    """
    Redirecting to the fron-page when logout from anywhere
    """ 
    logout(request)
    return HttpResponseRedirect("/")


        
def register(request):
    """
    Showing the registration form and creating the new user.
    It creates a folder for each new user to hold their images.
    """ 
    form = UserCreateForm()
    if request.method == 'POST':
        form = UserCreateForm(request.POST)
        if form.is_valid():          
            new_user = form.save()
            
            #It creates a private folder for each user 
            os.mkdir(os.path.join(PROFILE_ROOT+"/data/", new_user.username))
            
            return HttpResponseRedirect("/")
        else:
            form = UserCreateForm()

    return render_to_response("access/register.html", {
        'form' : form} , context_instance=RequestContext(request) 
    )
