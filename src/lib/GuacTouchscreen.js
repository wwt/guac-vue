import Guacamole from "guacamole-common-js";

const touchscreen = function(element) {
  /**
   * Reference to this Guacamole.Mouse.Touchscreen.
   * @private
   */
  var guac_touchscreen = this;
  /**
   * Whether a gesture is known to be in progress. If false, touch events
   * will be ignored.
   *
   * @private
   */
  var gesture_in_progress = false;
  /**
   * The start X location of a gesture.
   * @private
   */
  var gesture_start_x = null;
  /**
   * The start Y location of a gesture.
   * @private
   */
  var gesture_start_y = null;
  /**
   * The timeout associated with the delayed, cancellable click release.
   *
   * @private
   */
  var click_release_timeout = null;
  /**
   * The timeout associated with long-press for right click.
   *
   * @private
   */
  var long_press_timeout = null;
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
  this.clickMoveThreshold = 16 * (window.devicePixelRatio || 1);
  /**
   * The amount of time a press must be held for long press to be
   * detected.
   */
  this.longPressThreshold = 500;
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
   * as part of a "mousedown" gesture initiated by the user by pressing one
   * finger over the touchscreen element, as part of a "scroll" gesture
   * initiated by dragging two fingers up or down, etc.
   *
   * @event
   * @param {Guacamole.Mouse.State} state The current mouse state.
   */
  this.onmousedown = null;
  /**
   * Fired whenever a mouse button is effectively released. This can happen
   * as part of a "mouseup" gesture initiated by the user by removing the
   * finger pressed against the touchscreen element, or as part of a "scroll"
   * gesture initiated by dragging two fingers up or down, etc.
   *
   * @event
   * @param {Guacamole.Mouse.State} state The current mouse state.
   */
  this.onmouseup = null;
  /**
   * Fired whenever the user moves the mouse by dragging their finger over
   * the touchscreen element. Note that unlike Guacamole.Mouse.Touchpad,
   * dragging a finger over the touchscreen element will always cause
   * the mouse button to be effectively down, as if clicking-and-dragging.
   *
   * @event
   * @param {Guacamole.Mouse.State} state The current mouse state.
   */
  this.onmousemove = null;
  /**
   * Presses the given mouse button, if it isn't already pressed. Valid
   * button values are "left", "middle", "right", "up", and "down".
   *
   * @private
   * @param {String} button The mouse button to press.
   */
  function press_button(button) {
    if (!guac_touchscreen.currentState[button]) {
      guac_touchscreen.currentState[button] = true;
      if (guac_touchscreen.onmousedown)
        guac_touchscreen.onmousedown(guac_touchscreen.currentState);
    }
  }
  /**
   * Releases the given mouse button, if it isn't already released. Valid
   * button values are "left", "middle", "right", "up", and "down".
   *
   * @private
   * @param {String} button The mouse button to release.
   */
  function release_button(button) {
    if (guac_touchscreen.currentState[button]) {
      guac_touchscreen.currentState[button] = false;
      if (guac_touchscreen.onmouseup)
        guac_touchscreen.onmouseup(guac_touchscreen.currentState);
    }
  }
  /**
   * Clicks (presses and releases) the given mouse button. Valid button
   * values are "left", "middle", "right", "up", and "down".
   *
   * @private
   * @param {String} button The mouse button to click.
   */
  function click_button(button) {
    press_button(button);
    release_button(button);
  }
  /**
   * Moves the mouse to the given coordinates. These coordinates must be
   * relative to the browser window, as they will be translated based on
   * the touch event target's location within the browser window.
   *
   * @private
   * @param {Number} x The X coordinate of the mouse pointer.
   * @param {Number} y The Y coordinate of the mouse pointer.
   */
  function move_mouse(x, y) {
    guac_touchscreen.currentState.fromClientPosition(element, x, y);
    if (guac_touchscreen.onmousemove)
      guac_touchscreen.onmousemove(guac_touchscreen.currentState);
  }
  /**
   * Returns whether the given touch event exceeds the movement threshold for
   * clicking, based on where the touch gesture began.
   *
   * @private
   * @param {TouchEvent} e The touch event to check.
   * @return {Boolean} true if the movement threshold is exceeded, false
   *                   otherwise.
   */
  function finger_moved(e) {
    var touch = e.touches[0] || e.changedTouches[0];
    var delta_x = touch.clientX - gesture_start_x;
    var delta_y = touch.clientY - gesture_start_y;
    return (
      Math.sqrt(delta_x * delta_x + delta_y * delta_y) >=
      guac_touchscreen.clickMoveThreshold
    );
  }
  /**
   * Begins a new gesture at the location of the first touch in the given
   * touch event.
   *
   * @private
   * @param {TouchEvent} e The touch event beginning this new gesture.
   */
  function begin_gesture(e) {
    var touch = e.touches[0];
    gesture_in_progress = true;
    gesture_start_x = touch.clientX;
    gesture_start_y = touch.clientY;
  }
  /**
   * End the current gesture entirely. Wait for all touches to be done before
   * resuming gesture detection.
   *
   * @private
   */
  function end_gesture() {
    window.clearTimeout(click_release_timeout);
    window.clearTimeout(long_press_timeout);
    gesture_in_progress = false;
  }
  element.addEventListener(
    "touchend",
    function(e) {
      // Do not handle if no gesture
      if (!gesture_in_progress) return;
      // Ignore if more than one touch
      if (e.touches.length !== 0 || e.changedTouches.length !== 1) {
        end_gesture();
        return;
      }
      // Long-press, if any, is over
      window.clearTimeout(long_press_timeout);
      // Always release mouse button if pressed
      release_button("left");
      // If finger hasn't moved enough to cancel the click
      if (!finger_moved(e)) {
        e.preventDefault();
        // If not yet pressed, press and start delay release
        if (!guac_touchscreen.currentState.left) {
          var touch = e.changedTouches[0];
          move_mouse(touch.clientX, touch.clientY);
          press_button("left");
          // Release button after a delay, if not canceled
          click_release_timeout = window.setTimeout(function() {
            release_button("left");
            end_gesture();
          }, guac_touchscreen.clickTimingThreshold);
        }
      } // end if finger not moved
    },
    false
  );
  element.addEventListener(
    "touchstart",
    function(e) {
      // Ignore if more than one touch
      if (e.touches.length !== 1) {
        end_gesture();
        return;
      }
      e.preventDefault();
      // New touch begins a new gesture
      begin_gesture(e);
      // Keep button pressed if tap after left click
      window.clearTimeout(click_release_timeout);
      // Click right button if this turns into a long-press
      long_press_timeout = window.setTimeout(function() {
        var touch = e.touches[0];
        move_mouse(touch.clientX, touch.clientY);
        click_button("right");
        end_gesture();
      }, guac_touchscreen.longPressThreshold);
    },
    false
  );
  element.addEventListener(
    "touchmove",
    function(e) {
      // Do not handle if no gesture
      if (!gesture_in_progress) return;
      // Cancel long press if finger moved
      if (finger_moved(e)) window.clearTimeout(long_press_timeout);
      // Ignore if more than one touch
      if (e.touches.length !== 1) {
        end_gesture();
        return;
      }
      // Update mouse position if dragging
      if (guac_touchscreen.currentState.left) {
        e.preventDefault();
        // Update state
        var touch = e.touches[0];
        move_mouse(touch.clientX, touch.clientY);
      }
    },
    false
  );
};

export default {
  touchscreen,
};
