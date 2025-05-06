from djoser.email import ActivationEmail

class CustomActivationEmail(ActivationEmail):
  def get_context_data(self):
    context = super().get_context_data()
    context['domain'] = 'vid-olive.vercel.app'
    return context
  
