import Guacamole from "guacamole-common-js";

const touchpad = function(element) {
  /**
   * Reference to this Guacamole.Mouse.Touchpad.
   * @private
   */
  var guac_touchpad = this;
  /**
   * The distance a two-finger touch must move per scrollwheel event, in
   * pixels.
   */
  this.scrollThreshold = 20 * (window.devicePixelRatio || 1);
  /**
   * The maximum number of milliseconds to wait for a touch to end for the
   * gesture to be considered a click.
   */
  this.clickTimingThreshold = 250;
  /**
   * The maximum number of pixels to allow a touch to move for the gesture to
   * be considered a click.
   */
  this.clickMoveThreshold = 10 * (window.devicePixelRatio || 1);
  /**
   * The current mouse state. The properties of this state are updated when
   * mouse events fire. This state object is also passed in as a parameter to
   * the handler of any mouse events.
   *
   * @type {Guacamole.Mouse.State}
   */
  this.currentState = new Guacamole.Mouse.State(
    0,
    0,
    false,
    false,
    false,
    false,
    false
  );
  /**
   * Fired whenever a mouse button is effectively pressed. This can happen
   * as part of a "click" gesture initiated by the user by tapping one
   * or more fingers over the touchpad element, as part of a "scroll"
   * gesture initiated by dragging two fingers up or down, etc.
   *
   * @event
   * @param {Guacamole.Mouse.State} state The current mouse state.
   */
  this.onmousedown = null;
  /**
   * Fired whenever a mouse button is effectively released. This can happen
   * as part of a "click" gesture initiated by the user by tapping one
   * or more fingers over the touchpad element, as part of a "scroll"
   * gesture initiated by dragging two fingers up or down, etc.
   *
   * @event
   * @param {Guacamole.Mouse.State} state The current mouse state.
   */
  this.onmouseup = null;
  /**
   * Fired whenever the user moves the mouse by dragging their finger over
   * the touchpad element.
   *
   * @event
   * @param {Guacamole.Mouse.State} state The current mouse state.
   */
  this.onmousemove = null;
  var touch_count = 0;
  var last_touch_x = 0;
  var last_touch_y = 0;
  var last_touch_time = 0;
  var pixels_moved = 0;
  var touch_buttons = {
    1: "left",
    2: "right",
    3: "middle",
  };
  var gesture_in_progress = false;
  var click_release_timeout = null;
  element.addEventListener(
    "touchend",
    function(e) {
      e.preventDefault();

      // If we're handling a gesture AND this is the last touch
      if (gesture_in_progress && e.touches.length === 0) {
        var time = new Date().getTime();
        // Get corresponding mouse button
        var button = touch_buttons[touch_count];
        // If mouse already down, release anad clear timeout
        if (guac_touchpad.currentState[button]) {
          // Fire button up event
          guac_touchpad.currentState[button] = false;
          if (guac_touchpad.onmouseup)
            guac_touchpad.onmouseup(guac_touchpad.currentState);
          // Clear timeout, if set
          if (click_release_timeout) {
            window.clearTimeout(click_release_timeout);
            click_release_timeout = null;
          }
        }
        // If single tap detected (based on time and distance)
        if (
          time - last_touch_time <= guac_touchpad.clickTimingThreshold &&
          pixels_moved < guac_touchpad.clickMoveThreshold
        ) {
          // Fire button down event
          guac_touchpad.currentState[button] = true;
          if (guac_touchpad.onmousedown)
            guac_touchpad.onmousedown(guac_touchpad.currentState);
          // Delay mouse up - mouse up should be canceled if
          // touchstart within timeout.
          click_release_timeout = window.setTimeout(function() {
            // Fire button up event
            guac_touchpad.currentState[button] = false;
            if (guac_touchpad.onmouseup)
              guac_touchpad.onmouseup(guac_touchpad.currentState);

            // Gesture now over
            gesture_in_progress = false;
          }, guac_touchpad.clickTimingThreshold);
        }
        // If we're not waiting to see if this is a click, stop gesture
        if (!click_release_timeout) gesture_in_progress = false;
      }
    },
    false
  );
  element.addEventListener(
    "touchstart",
    function(e) {
      e.preventDefault();
      // Track number of touches, but no more than three
      touch_count = Math.min(e.touches.length, 3);
      // Clear timeout, if set
      if (click_release_timeout) {
        window.clearTimeout(click_release_timeout);
        click_release_timeout = null;
      }
      // Record initial touch location and time for touch movement
      // and tap gestures
      if (!gesture_in_progress) {
        // Stop mouse events while touching
        gesture_in_progress = true;
        // Record touch location and time
        var starting_touch = e.touches[0];
        last_touch_x = starting_touch.clientX;
        last_touch_y = starting_touch.clientY;
        last_touch_time = new Date().getTime();
        pixels_moved = 0;
      }
    },
    false
  );
  element.addEventListener(
    "touchmove",
    function(e) {
      e.preventDefault();
      // Get change in touch location
      var touch = e.touches[0];
      var delta_x = touch.clientX - last_touch_x;
      var delta_y = touch.clientY - last_touch_y;
      // Track pixels moved
      pixels_moved += Math.abs(delta_x) + Math.abs(delta_y);
      // If only one touch involved, this is mouse move
      if (touch_count === 1) {
        // Calculate average velocity in Manhatten pixels per millisecond
        var velocity = pixels_moved / (new Date().getTime() - last_touch_time);
        // Scale mouse movement relative to velocity
        var scale = 1 + velocity;
        // Update mouse location
        guac_touchpad.currentState.x += delta_x * scale;
        guac_touchpad.currentState.y += delta_y * scale;
        // Prevent mouse from leaving screen
        if (guac_touchpad.currentState.x < 0) guac_touchpad.currentState.x = 0;
        else if (guac_touchpad.currentState.x >= element.offsetWidth)
          guac_touchpad.currentState.x = element.offsetWidth - 1;
        if (guac_touchpad.currentState.y < 0) guac_touchpad.currentState.y = 0;
        else if (guac_touchpad.currentState.y >= element.offsetHeight)
          guac_touchpad.currentState.y = element.offsetHeight - 1;
        // Fire movement event, if defined
        if (guac_touchpad.onmousemove)
          guac_touchpad.onmousemove(guac_touchpad.currentState);
        // Update touch location
        last_touch_x = touch.clientX;
        last_touch_y = touch.clientY;
      }
      // Interpret two-finger swipe as scrollwheel
      else if (touch_count === 2) {
        // If change in location passes threshold for scroll
        if (Math.abs(delta_y) >= guac_touchpad.scrollThreshold) {
          // Decide button based on Y movement direction
          var button;
          if (delta_y > 0) button = "down";
          else button = "up";
          // Fire button down event
          guac_touchpad.currentState[button] = true;
          if (guac_touchpad.onmousedown)
            guac_touchpad.onmousedown(guac_touchpad.currentState);
          // Fire button up event
          guac_touchpad.currentState[button] = false;
          if (guac_touchpad.onmouseup)
            guac_touchpad.onmouseup(guac_touchpad.currentState);
          // Only update touch location after a scroll has been
          // detected
          last_touch_x = touch.clientX;
          last_touch_y = touch.clientY;
        }
      }
    },
    false
  );
};

export default {
  touchpad,
};
