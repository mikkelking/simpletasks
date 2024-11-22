import { assert, expect } from "chai";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { Tasks } from "/api/tasks/tasks";
import "/api/tasks/tasks.methods";
import { mockLoggedUserId } from "../../tests/helpers";

if (Meteor.isServer) {
  describe("Tasks", () => {
    describe("methods", () => {
      const userId = Random.id();
      let taskId;

      beforeEach(async () => {
        mockLoggedUserId(userId);
        await Tasks.removeAsync({}).catch((error) => {
          console.error(error);
        });
        taskId = await Tasks.insertAsync({
          text: "Test Task",
          checked: false,
          createdAt: new Date(),
          userId,
        }).catch((error) => {
          console.error(error);
        });
      });

      it("can delete owned task", async () => {
        await Meteor.callAsync("removeTask", { taskId });

        assert.equal(await Tasks.find().countAsync(), 0);
      });

      it("can't delete task if not authenticated", async () => {
        mockLoggedUserId(null);
        try {
          await Meteor.callAsync("removeTask", { taskId });
        } catch (error) {
          expect(error).to.be.instanceof(Error);
          expect(error.reason).to.be.equal("Not authorized.");
        }
        assert.equal(await Tasks.find().countAsync(), 1);
      });

      it("can't delete task from another owner", async () => {
        mockLoggedUserId(Random.id());
        try {
          await Meteor.callAsync("removeTask", { taskId });
        } catch (error) {
          expect(error).to.be.instanceof(Error);
          expect(error.reason).to.be.equal("Access denied.");
        }
        assert.equal(await Tasks.find().countAsync(), 1);
      });

      it("can change the status of a task", async () => {
        const originalTask = await Tasks.findOneAsync(taskId);
        await Meteor.callAsync("toggleTaskDone", { taskId });

        const updatedTask = await Tasks.findOneAsync(taskId);
        assert.notEqual(updatedTask.checked, originalTask.checked);
      });

      it("can't change the status of a task from another owner", async () => {
        mockLoggedUserId(Random.id());
        const originalTask = await Tasks.findOneAsync(taskId);

        try {
          await Meteor.callAsync("toggleTaskDone", { taskId });
        } catch (error) {
          expect(error).to.be.instanceof(Error);
          expect(error.reason).to.be.equal("Access denied.");
        }
        const task = await Tasks.findOneAsync(taskId);
        assert.equal(task.checked, originalTask.checked);
      });

      it("can insert new tasks", async () => {
        const text = "New Task";
        await Meteor.callAsync("insertTask", { text });

        const task = await Tasks.findOneAsync({ text });
        assert.isNotNull(task);
        assert.isTrue(task.text === text);
      });

      it("can't insert new tasks if not authenticated", async () => {
        mockLoggedUserId(null);
        const text = "New Task";
        try {
          await Meteor.callAsync("insertTask", { text });
        } catch (error) {
          expect(error).to.be.instanceof(Error);
          expect(error.reason).to.be.equal("Not authorized.");
        }
        const task = await Tasks.findOneAsync({ text });
        assert.isUndefined(task);
      });
    });
  });
}
