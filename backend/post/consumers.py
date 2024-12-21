import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Post

class PostConsumer(AsyncWebsocketConsumer):
  async def connect(self):
    # Accept websocket connections
    self.room_group_name = 'posts'
    await self.channel_layer.group_add(self.room_group_name, self.channel_name)
    await self.accept()

  async def disconnect(self, close_code):
    await self.channel_layer.group_discard(self.room_group_name, self.channel_name)  

  async def receive(self, text_data):
    data = json.loads(text_data)
    message_type = data.get('type')

    if message_type == 'create_post':
      post_data = data.get['post', {}]
      Post.objects.create(**post_data)

      await self.channel_layer.group_send(
        self.room_group_name,
        {
          'type': 'broadcast_post',
          'post': post_data,
        }
      )

  async def broadcast_post(self, event):
    await self.send(text_data=json.dumps({
      'type': 'new_post',
      'post': event['post'],
    }))    

