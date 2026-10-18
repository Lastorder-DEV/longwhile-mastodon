# frozen_string_literal: true

class AboutController < ApplicationController
  include WebAppControllerConcern

  skip_before_action :require_functional!
  before_action :redirect_unauthenticated_to_sign_in!

  def show
    expires_in(15.seconds, public: true, stale_while_revalidate: 30.seconds, stale_if_error: 1.day) unless user_signed_in?
  end
end
