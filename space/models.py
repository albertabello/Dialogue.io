from django.db import models
from django import forms
from django.forms import ModelForm
from django.conf import Settings 
from django.contrib.auth.models import User

from django.template.defaultfilters import slugify

from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic

from django.db import models

# Create your models here.
from django.contrib.auth.models import User

import datetime

class Call(models.Model):

    name = models.CharField(max_length=20)
    slug = models.SlugField(blank=True)

    class Meta:
        ordering = ("name",)

    def __unicode__(self):
        return self.name

    @models.permalink
    def get_absolute_url(self):
        return ("room", (self.slug,))

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super(Call, self).save(*args, **kwargs)

class ChatUser(models.Model):

    name = models.CharField(max_length=20)
    session = models.CharField(max_length=20)
    room = models.ForeignKey("space.Call", related_name="users")

    class Meta:
        ordering = ("name",)

    def __unicode__(self):
        return self.name

class Session(models.Model):
    
    id_websocket = models.CharField(max_length=20)
    time = models.BooleanField()
    
    class Meta:
        ordering=("id_websocket",)
    
    def __unicode__(self):
        return self.id